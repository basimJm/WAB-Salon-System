package com.fab.wab.merchant.app.request

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.koin.java.KoinJavaComponent

/** "Accept" on the request notification: answered in the background, the notification shows the outcome. */
class RequestActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_ACCEPT) return
        val bookingId = intent.getStringExtra(EXTRA_BOOKING_ID) ?: return
        val pending = goAsync()
        KoinJavaComponent.getKoin().get<OutsideBookingRequests>().acceptFromNotification(bookingId) { pending.finish() }
    }

    companion object {
        const val ACTION_ACCEPT = "com.fab.wab.merchant.request.ACCEPT"
        const val EXTRA_BOOKING_ID = "bookingId"
    }
}
