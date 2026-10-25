package com.fab.wab.merchant.app.request

import android.content.Context
import android.content.Intent
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.request_accepted
import com.fab.wab.merchant.app.resources.request_failed
import com.fab.wab.merchant.app.resources.request_handled
import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import com.fab.wab.merchant.core.ui.permission.OverlayPermission
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.getString
import org.koin.core.Koin

/**
 * PRD M10 outside the app on Android (MER-029). Every booking-request trigger (FCM data message, dev trigger) lands in
 * [onBookingRequested]: in the foreground the in-app sheet takes it (MER-028); otherwise, for a request still
 * PENDING, the overlay card when "display over other apps" is granted, else the heads-up notification.
 */
class OutsideBookingRequests(
    private val context: Context,
    private val koin: Koin,
    smallIcon: Int,
    private val bookingIntent: (String) -> Intent,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val repository: BookingsRepository get() = koin.get()
    private val analytics: AnalyticsTracker get() = koin.get()
    private val notifier = RequestNotifier(context, smallIcon, bookingIntent)
    private val overlay = RequestOverlayWindow(context, koin, ::openBooking)

    /** An FCM data message: true when it was a booking request (handled here), false for the other notifications. */
    fun onPush(data: Map<String, String>): Boolean {
        if (data[PushKeys.EVENT] != RealtimeEvents.BOOKING_REQUESTED) return false
        bookingRequestId(data)?.let(::onBookingRequested)
        return true
    }

    fun onBookingRequested(bookingId: String) {
        if (bookingId.isBlank()) return
        if (PushSignals.appForeground.value) {
            PushSignals.publishReceived(requestPush(bookingId))
            return
        }
        if (overlay.isShowing) {
            overlay.show(bookingId)
            return
        }
        scope.launch {
            val details = (repository.details(bookingId) as? AppResult.Success)?.data ?: return@launch
            if (details.summary.status != BookingStatus.PENDING) return@launch
            if (koin.get<OverlayPermission>().isGranted()) {
                overlay.show(bookingId)
            } else {
                notifier.show(details)
                track(BookingsAnalytics.ACTION_SHOWN)
            }
        }
    }

    /** Accept from the notification: the API answers, the notification shows the outcome; never a blind retry. */
    fun acceptFromNotification(bookingId: String, done: () -> Unit) {
        scope.launch {
            try {
                val result = repository.approve(bookingId)
                val text = when {
                    result is AppResult.Success -> {
                        track(BookingsAnalytics.ACTION_ACCEPT)
                        getString(Res.string.request_accepted)
                    }
                    result is AppResult.Error && result.appError.isAlreadyHandled() -> getString(Res.string.request_handled)
                    else -> getString(Res.string.request_failed)
                }
                notifier.result(bookingId, text)
            } finally {
                done()
            }
        }
    }

    private fun openBooking(bookingId: String) {
        context.startActivity(bookingIntent(bookingId).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP))
    }

    private fun track(name: String) = analytics.trackAction(
        AnalyticsAction(name, analyticsParams { text(BookingsAnalytics.PARAM_CHANNEL, BookingsAnalytics.CHANNEL_NOTIFICATION) }),
    )
}
