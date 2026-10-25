package com.fab.wab.merchant.app.request

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.notification.push.PushNotification
import com.fab.wab.merchant.core.realtime.RealtimeEvents

/** The booking id of a `booking.requested` push (FCM data / APNs userInfo); null for every other notification. */
fun bookingRequestId(data: Map<String, String>): String? =
    data[PushKeys.BOOKING_ID]?.takeIf { data[PushKeys.EVENT] == RealtimeEvents.BOOKING_REQUESTED && it.isNotBlank() }

/** The same data a booking-request push carries, for the in-app sheet (MER-028). */
fun requestPush(bookingId: String) = PushNotification(
    title = "",
    message = "",
    data = mapOf(PushKeys.EVENT to RealtimeEvents.BOOKING_REQUESTED, PushKeys.BOOKING_ID to bookingId),
)

/** Another member answered first: say so instead of retrying (CLAUDE.md §8.2). */
fun AppError.isAlreadyHandled(): Boolean = this is AppError.ServerError && code == ErrorCode.ALREADY_HANDLED
