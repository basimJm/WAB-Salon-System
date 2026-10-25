package com.fab.wab.merchant.app.request

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val CONFLICT = 409

/** MER-029 / MER-030: which pushes are booking requests, and the "handled elsewhere" outcome. */
class BookingRequestPushTest {
    @Test
    fun onlyBookingRequestedPushesWithAnIdAreRequests() {
        assertEquals("b1", bookingRequestId(mapOf(PushKeys.EVENT to RealtimeEvents.BOOKING_REQUESTED, PushKeys.BOOKING_ID to "b1")))
        assertNull(bookingRequestId(mapOf(PushKeys.EVENT to RealtimeEvents.BOOKING_UPDATED, PushKeys.BOOKING_ID to "b1")))
        assertNull(bookingRequestId(mapOf(PushKeys.EVENT to RealtimeEvents.BOOKING_REQUESTED, PushKeys.BOOKING_ID to " ")))
        assertNull(bookingRequestId(emptyMap()))
    }

    @Test
    fun theInAppPushRoundTripsAndAlreadyHandledIsRecognised() {
        assertEquals("b2", bookingRequestId(requestPush("b2").data))
        assertTrue(AppError.ServerError(ErrorCode.ALREADY_HANDLED, CONFLICT, null).isAlreadyHandled())
        assertFalse(AppError.ServerError(ErrorCode.SLOT_TAKEN, CONFLICT, null).isAlreadyHandled())
        assertFalse(AppError.NetworkError("offline").isAlreadyHandled())
    }
}
