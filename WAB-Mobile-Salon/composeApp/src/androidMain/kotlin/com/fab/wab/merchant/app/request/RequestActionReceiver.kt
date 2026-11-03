package com.fab.wab.merchant.app.request

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.koin.java.KoinJavaComponent

/**
 * "Accept" on the request notification and Completed / No-show on a close reminder (MER-086): answered in the
 * background, the notification shows the outcome.
 */
class RequestActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val bookingId = intent.getStringExtra(EXTRA_BOOKING_ID) ?: return
        val close = BookingCloseCategory.actionOf(intent.action)
        if (intent.action != ACTION_ACCEPT && close == null) return
        val pending = goAsync()
        val koin = KoinJavaComponent.getKoin()
        if (close != null) {
            koin.get<CloseReminders>().act(bookingId, close) { pending.finish() }
        } else {
            koin.get<OutsideBookingRequests>().acceptFromNotification(bookingId) { pending.finish() }
        }
    }

    companion object {
        const val ACTION_ACCEPT = "com.fab.wab.merchant.request.ACCEPT"
        const val EXTRA_BOOKING_ID = "bookingId"
    }
}
