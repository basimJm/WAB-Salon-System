package com.fab.wab.customer.feature.booking.domain.model

import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.salon.SalonService

object BookingFlowDefaults {
    /** PRD S16 step 4: main person + up to 5 companions. */
    const val MAX_COMPANIONS = 5
    /** Contract: person name 1–50 characters. */
    const val MAX_NAME_LENGTH = 50
    /** PRD S16 step 2: calendar up to 90 days ahead. */
    const val MAX_DAYS_AHEAD = 90
    /** PRD S16 step 2: slots every 15 minutes. */
    const val SLOT_MINUTES = 15
}

/** Staff choice of a person (PRD S16 step 3). */
sealed interface StaffChoice {
    data object Any : StaffChoice
    data class Specific(val staffId: String, val firstName: String) : StaffChoice
}

/** One person of the draft being built on the device (main first, then companions). */
data class DraftPerson(
    val name: String = "",
    val isBride: Boolean = false,
    val serviceIds: List<String> = emptyList(),
    val date: String? = null,
    val start: String? = null,
    val staff: StaffChoice? = null,
    /** End of the picked slot (server `slots[].end`); other persons' picks are sent with start AND end (CUS-060). */
    val end: String? = null,
) {
    val hasSlot: Boolean get() = start != null
}

/** Running totals of a person's selection (PRD S16 step 1). */
data class SelectionTotals(val priceFils: Long, val durationMinutes: Int)

/** Money is JOD text with up to 3 decimals (fils); summed as integer fils to avoid float drift. */
fun jodToFils(amount: String): Long {
    val parts = amount.trim().split(DECIMAL_SEPARATOR)
    val whole = parts.getOrNull(0)?.toLongOrNull() ?: return 0
    val fraction = parts.getOrNull(1).orEmpty().padEnd(FILS_DIGITS, ZERO).take(FILS_DIGITS).toLongOrNull() ?: 0
    return whole * FILS_PER_JOD + fraction
}

fun filsToJod(fils: Long): String {
    val whole = fils / FILS_PER_JOD
    val fraction = fils % FILS_PER_JOD
    if (fraction == 0L) return whole.toString()
    return "$whole$DECIMAL_SEPARATOR${fraction.toString().padStart(FILS_DIGITS, ZERO).trimEnd(ZERO)}"
}

fun selectionTotalsOf(services: List<SalonService>, selectedIds: Collection<String>): SelectionTotals {
    val selected = services.filter { it.id in selectedIds }
    return SelectionTotals(selected.sumOf { jodToFils(it.price) }, selected.sumOf { it.durationMinutes })
}

private const val DECIMAL_SEPARATOR = '.'
private const val FILS_DIGITS = 3
private const val FILS_PER_JOD = 1000L
private const val ZERO = '0'

/** Server-side draft (`POST /bookings/drafts`): price + policy snapshot and the slot holds (10 min). */
data class DraftPolicy(
    val cancellationWindowHours: Double,
    val paymentOptions: List<PaymentMethod>,
    val depositPercentage: Double?,
    val depositRefundableOnCustomerCancel: Boolean,
    val notes: String?,
)

data class DraftServiceLine(val salonServiceId: String, val name: String, val price: String, val durationMinutes: Int)

data class DraftPersonResult(
    val name: String,
    val isMain: Boolean,
    val isBride: Boolean,
    val services: List<DraftServiceLine>,
    val staffFirstName: String,
    val staffIsAny: Boolean,
    val start: String,
    val end: String,
    val subtotal: String,
)

data class DraftMoney(val total: String, val deposit: String, val dueOnline: String, val remaining: String)

data class BookingDraft(
    val id: String,
    val salonId: String,
    val salonName: String,
    val expiresAt: String,
    val paymentMethod: PaymentMethod,
    val persons: List<DraftPersonResult>,
    val money: DraftMoney,
    val policy: DraftPolicy,
)

/** `POST /bookings` 201: the request is PENDING until the salon responds (PRD S17 shows the reference). */
data class CreatedBooking(val id: String, val referenceNumber: String, val status: String)
