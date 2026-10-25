package com.fab.wab.merchant.core.domain.booking

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode

/**
 * Booking ids a schedule / closure / leave / staff change would break (`409 SCHEDULE_CONFLICT`, ids in
 * `details[].field`), or null for any other error.
 */
fun AppError.conflictBookingIds(): List<String>? {
    val server = this as? AppError.ServerError ?: return null
    if (server.code != ErrorCode.SCHEDULE_CONFLICT) return null
    return server.details.map { it.field }.filter { it.isNotBlank() }.distinct()
}

/** Reason codes sent with the affected-bookings cancellation (the server shows the reason to customers). */
object AffectedReasons {
    const val CLOSURE = "EXCEPTIONAL_CLOSURE"
    const val STAFF_UNAVAILABLE = "STAFF_UNAVAILABLE"
    const val OTHER = "OTHER"
}

/** `POST /bookings/cancel-affected`: rejects pending / cancels approved bookings with a full refund (PRD M15, M17). */
interface AffectedBookingsRepository {
    /** True when every booking was handled; false when some could not be (the change will conflict again). */
    suspend fun cancel(bookingIds: List<String>, reasonCode: String, reasonText: String): AppResult<Boolean>
}
