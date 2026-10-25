package com.fab.wab.merchant.request

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.fab.wab.merchant.app.request.OutsideBookingRequests
import com.fab.wab.merchant.core.domain.dev.MockControls
import com.fab.wab.merchant.core.notification.push.PushKeys
import org.koin.java.KoinJavaComponent

/**
 * Debug builds only (the receiver is declared in the debug manifest): runs the same path as an FCM booking-request data
 * message, so the overlay / heads-up / in-app sheet can be tested before Firebase is configured. In mock mode the
 * booking is marked PENDING first (the fixtures answer APPROVED).
 */
class DebugBookingRequestReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action?.endsWith(ACTION_SUFFIX) != true) return
        val bookingId = intent.getStringExtra(PushKeys.BOOKING_ID)?.takeIf { it.isNotBlank() } ?: return
        val koin = KoinJavaComponent.getKoin()
        koin.get<MockControls>().markBookingPending(bookingId)
        koin.get<OutsideBookingRequests>().onBookingRequested(bookingId)
    }

    private companion object {
        const val ACTION_SUFFIX = ".DEBUG_BOOKING_REQUEST"
    }
}
