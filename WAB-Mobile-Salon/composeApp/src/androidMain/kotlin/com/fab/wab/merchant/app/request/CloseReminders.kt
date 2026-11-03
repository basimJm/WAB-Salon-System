package com.fab.wab.merchant.app.request

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.close_channel
import com.fab.wab.merchant.app.resources.close_title
import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseAction
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseBookingUseCase
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseOutcome
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.getString
import org.koin.core.Koin

/**
 * BUSINESS_DOMAIN §5.21 on Android (MER-086): a `booking.close_reminder` / `booking.close_overdue` push that reaches the
 * app in the background becomes a notification with Completed / No-show (answered in the background through
 * [CloseBookingUseCase]); its tap and every fallback open the booking details. In the foreground the shell banner
 * shows it like any other push.
 */
class CloseReminders(
    private val context: Context,
    private val koin: Koin,
    private val smallIcon: Int,
    private val bookingIntent: (String) -> Intent,
) {
    private val close: CloseBookingUseCase get() = koin.get()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val manager = context.getSystemService(NotificationManager::class.java)

    /** True when [data] was a close reminder shown here; false lets the generic push path handle it. */
    fun onPush(data: Map<String, String>, title: String?, body: String?): Boolean {
        val push = closePushOf(data) ?: return false
        if (PushSignals.appForeground.value) return false
        scope.launch { show(push, title, body) }
        return true
    }

    /** Completed / No-show from the notification; the outcome replaces it (tap opens the booking). */
    fun act(bookingId: String, action: CloseAction, done: () -> Unit) {
        scope.launch {
            try {
                val outcome = close(bookingId, action)
                ensureChannel()
                val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(smallIcon)
                    .setContentTitle(closeOutcomeText(outcome))
                    .setContentIntent(openIntent(bookingId))
                    .setAutoCancel(true)
                    .setSilent(outcome !is CloseOutcome.OpenDetails)
                    .build()
                manager.notify(notificationId(bookingId), notification)
            } finally {
                done()
            }
        }
    }

    private suspend fun show(push: ClosePush, title: String?, body: String?) {
        ensureChannel()
        val shownTitle = title?.takeIf { it.isNotBlank() } ?: getString(Res.string.close_title)
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(smallIcon)
            .setContentTitle(shownTitle)
            .setContentText(body ?: push.reference.orEmpty())
            .setStyle(NotificationCompat.BigTextStyle().bigText(body ?: push.reference.orEmpty()))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openIntent(push.bookingId))
            .setAutoCancel(true)
        push.actions.forEach { action ->
            builder.addAction(0, getString(closeActionTitle(action)), actionIntent(push.bookingId, action))
        }
        manager.notify(notificationId(push.bookingId), builder.build())
    }

    private suspend fun ensureChannel() {
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, getString(Res.string.close_channel), NotificationManager.IMPORTANCE_HIGH),
        )
    }

    private fun openIntent(bookingId: String): PendingIntent = PendingIntent.getActivity(
        context,
        notificationId(bookingId),
        bookingIntent(bookingId).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun actionIntent(bookingId: String, action: CloseAction): PendingIntent = PendingIntent.getBroadcast(
        context,
        notificationId(bookingId) + action.ordinal + 1,
        Intent(context, RequestActionReceiver::class.java)
            .setAction(BookingCloseCategory.identifierOf(action))
            .putExtra(RequestActionReceiver.EXTRA_BOOKING_ID, bookingId),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    /** One notification per booking, apart from the request notification of the same booking. */
    private fun notificationId(bookingId: String): Int = (CHANNEL_ID + bookingId).hashCode()

    private companion object {
        const val CHANNEL_ID = "wab_booking_close"
    }
}
