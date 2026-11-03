package com.fab.wab.merchant.feature.bookings.domain.model

import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.core.domain.policy.PolicyTerms
import kotlinx.datetime.LocalDate
import kotlin.time.Instant

/** PRD M08 tabs (`GET /bookings?tab`); TO_CLOSE = approved bookings whose end passed, oldest first (§5.21). */
enum class BookingsTab { PENDING, UPCOMING, TODAY, TO_CLOSE, PAST }

/**
 * A staff member; [branchId] = the member's branch (null for the owner or an older server); [photoUrl] = the member's
 * photo on booking rows (contract 1.6.0), null = letter avatar.
 */
data class StaffRef(val id: String, val name: String, val branchId: String? = null, val photoUrl: String? = null)

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
    /** Who created it (BUSINESS_DOMAIN §5.20): the customer in the app, or a member for the customer. */
    val source: BookingSource = BookingSource.CUSTOMER_APP,
    /** The member who created a MERCHANT booking (`createdBy.name`); null for app bookings. */
    val createdByName: String? = null,
    /** False when the customer has no WAB account (`customer.id` null, §5.20). */
    val customerHasAccount: Boolean = true,
) {
    val isCreatedByBusiness: Boolean get() = source == BookingSource.MERCHANT
}

/** `source` of a booking (contract 1.13.0). */
enum class BookingSource {
    CUSTOMER_APP,
    MERCHANT,
    ;

    companion object {
        fun fromCode(code: String?): BookingSource = entries.firstOrNull { it.name == code } ?: CUSTOMER_APP
    }
}

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
    /** Tattoo design image (BUSINESS_DOMAIN §5.23): a short-lived signed URL; null when none. */
    val referenceImageUrl: String? = null,
)

/**
 * `money` of `GET /bookings/{id}` (contract 1.6.0, BUSINESS_DOMAIN §5.5): [remaining] = still to collect at the salon
 * (0 once the booking is final), [paidAtSalon] = collected at the salon (COMPLETED). Amounts are JOD decimal texts.
 */
data class BookingMoney(
    val total: String,
    val dueOnline: String,
    val paidOnline: String,
    val remaining: String,
    val refunded: String,
    val paidAtSalon: String = ZERO_AMOUNT,
) {
    /** The "Paid at salon" row shows only once something was collected there. */
    val hasPaidAtSalon: Boolean get() = !isZeroAmount(paidAtSalon)

    /** The "Refunded" row shows only when money went back to the customer. */
    val hasRefund: Boolean get() = !isZeroAmount(refunded)
}

private const val ZERO_AMOUNT = "0.000"

/** True for a blank or all-zero decimal text ("0", "0.000"); a malformed text counts as non-zero so it stays visible. */
fun isZeroAmount(amount: String): Boolean {
    val text = amount.trim()
    return text.isEmpty() || (text.any { it.isDigit() } && text.all { it == '0' || it == '.' })
}

data class StatusChange(val status: BookingStatus?, val actorType: String, val reason: String?, val at: Instant?)

/** What the signed-in member may do now (`actions`, already filtered by the server for status, time and permission). */
enum class BookingAction { APPROVE, REJECT, CANCEL, REASSIGN, COMPLETE, NO_SHOW }

/** `GET /bookings/{id}` (PRD M09). */
data class BookingDetails(
    val summary: BookingSummary,
    val refundStatus: RefundStatus,
    val persons: List<BookingPerson>,
    val money: BookingMoney,
    /** The salon policy snapshotted at booking time; null for bookings without one. */
    val policy: PolicyTerms?,
    val history: List<StatusChange>,
    /** The free text the salon / customer typed (`reasonText`), null when only a code was chosen. */
    val rejectionReason: String?,
    val cancellationReason: String?,
    val createdAt: Instant?,
    val actions: Set<BookingAction>,
    /** `reasonCode` (e.g. FULLY_BOOKED): shown in the app language when there is no text (e2e: raw code was shown). */
    val rejectionCode: String? = null,
    val cancellationCode: String? = null,
)

/** Reasons offered by the reason picker (Design Script §1.2, design 03); OTHER needs a text. */
enum class ResponseReason {
    FULLY_BOOKED, STAFF_UNAVAILABLE, SERVICE_UNAVAILABLE, SALON_EMERGENCY, EXCEPTIONAL_CLOSURE, OTHER;

    companion object {
        /** The picker reason of a server `reasonCode`; null for codes the app has no text for (shown as sent). */
        fun fromCode(code: String?): ResponseReason? = entries.firstOrNull { it.name == code }
    }
}

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
