package com.fab.wab.merchant.feature.bookings.domain.model

import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import kotlinx.datetime.LocalDate
import kotlin.time.Instant

/** PRD M08 tabs (`GET /bookings?tab`). */
enum class BookingsTab { PENDING, UPCOMING, TODAY, PAST }

/** A staff member; [branchId] = the member's branch (null for the owner or an older server). */
data class StaffRef(val id: String, val name: String, val branchId: String? = null)

/** The branch of a booking (`branch {id, name, locationText}`, MER-063). */
data class BranchRef(val id: String, val name: String, val locationText: String?)

/** One row of `GET /bookings` (merchant view); [total] is the contract's JOD decimal text. */
data class BookingSummary(
    val id: String,
    val reference: String,
    val status: BookingStatus,
    val paymentStatus: PaymentStatus?,
    val hasBride: Boolean,
    val start: Instant,
    val end: Instant,
    val respondBy: Instant?,
    val personsCount: Int,
    val total: String,
    val customerName: String,
    val customerPhone: String?,
    val staff: List<StaffRef>,
    val branch: BranchRef? = null,
)

/** PRD M08 filter sheet: date range, staff (multi), status (multi), bride only, payment status. */
data class BookingFilter(
    val from: LocalDate? = null,
    val to: LocalDate? = null,
    val staffIds: Set<String> = emptySet(),
    val statuses: Set<BookingStatus> = emptySet(),
    val brideOnly: Boolean = false,
    val paymentStatus: PaymentStatus? = null,
) {
    /** Number of active criteria (the filter icon badge and the chips). */
    val activeCount: Int
        get() = listOf(
            from != null || to != null,
            staffIds.isNotEmpty(),
            statuses.isNotEmpty(),
            brideOnly,
            paymentStatus != null,
        ).count { it }
}

/** [branchId] = the owner's branch choice (`?branchId=`); null = every branch the member may see. */
data class BookingQuery(
    val tab: BookingsTab,
    val text: String = "",
    val filter: BookingFilter = BookingFilter(),
    val branchId: String? = null,
)

data class BookedService(val name: String, val price: String, val durationMinutes: Int)

data class BookingPerson(
    val name: String,
    val isBride: Boolean,
    val start: Instant?,
    val end: Instant?,
    val subtotal: String,
    val staff: StaffRef?,
    val services: List<BookedService>,
)

data class BookingMoney(val total: String, val dueOnline: String, val paidOnline: String, val remaining: String, val refunded: String)

data class StatusChange(val status: BookingStatus?, val actorType: String, val reason: String?, val at: Instant?)

/** What the signed-in member may do now (`actions`, already filtered by the server for status, time and permission). */
enum class BookingAction { APPROVE, REJECT, CANCEL, REASSIGN, COMPLETE, NO_SHOW }

/** `GET /bookings/{id}` (PRD M09). */
data class BookingDetails(
    val summary: BookingSummary,
    val refundStatus: RefundStatus,
    val persons: List<BookingPerson>,
    val money: BookingMoney,
    val policy: Map<String, String>,
    val history: List<StatusChange>,
    val rejectionReason: String?,
    val cancellationReason: String?,
    val createdAt: Instant?,
    val actions: Set<BookingAction>,
)

/** Reasons offered by the reason picker (Design Script §1.2, design 03); OTHER needs a text. */
enum class ResponseReason { FULLY_BOOKED, STAFF_UNAVAILABLE, SERVICE_UNAVAILABLE, SALON_EMERGENCY, EXCEPTIONAL_CLOSURE, OTHER }

/** Rejection reasons of a pending request (design 03 `reasons`). */
val REJECT_REASONS = listOf(
    ResponseReason.FULLY_BOOKED,
    ResponseReason.STAFF_UNAVAILABLE,
    ResponseReason.SERVICE_UNAVAILABLE,
    ResponseReason.OTHER,
)

/** Cancellation reasons of an approved booking (design 03 `cancelReasons`). */
val CANCEL_REASONS = listOf(
    ResponseReason.SALON_EMERGENCY,
    ResponseReason.STAFF_UNAVAILABLE,
    ResponseReason.EXCEPTIONAL_CLOSURE,
    ResponseReason.OTHER,
)

object BookingsDefaults {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 10
    const val SEARCH_DEBOUNCE_MS = 500L
    const val REASON_TEXT_MAX = 300
}
