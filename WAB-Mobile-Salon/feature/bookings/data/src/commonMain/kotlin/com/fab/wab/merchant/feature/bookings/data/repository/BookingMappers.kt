package com.fab.wab.merchant.feature.bookings.data.repository

import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersDataItem
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.feature.bookings.domain.model.BookedService
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.domain.model.BookingMoney
import com.fab.wab.merchant.feature.bookings.domain.model.BookingPerson
import com.fab.wab.merchant.feature.bookings.domain.model.BookingSummary
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import com.fab.wab.merchant.feature.bookings.domain.model.StatusChange
import kotlinx.serialization.json.JsonPrimitive
import kotlin.time.Instant

private const val NAME_SEPARATOR = " "

internal fun instantOf(value: String?): Instant? = value?.let { runCatching { Instant.parse(it) }.getOrNull() }

/** A booking without a parseable start is unusable on a calendar or a card: it is dropped from lists. */
fun GetBookingsDataItem.toDomain(): BookingSummary? {
    val start = instantOf(appointmentStart) ?: return null
    return BookingSummary(
        id = id,
        reference = referenceNumber,
        status = BookingStatus.fromCode(status) ?: BookingStatus.PENDING,
        paymentStatus = PaymentStatus.fromCode(paymentStatus),
        hasBride = hasBride,
        start = start,
        end = instantOf(appointmentEnd) ?: start,
        respondBy = instantOf(respondBy),
        personsCount = personsCount.toInt(),
        total = total,
        customerName = customer?.name.orEmpty(),
        customerPhone = customer?.phone,
        staff = staff.map { StaffRef(it.id, it.name) },
    )
}

fun GetBookingsByIdData.toDomain(): BookingDetails? {
    val start = instantOf(appointmentStart) ?: return null
    val summary = BookingSummary(
        id = id, reference = referenceNumber, status = BookingStatus.fromCode(status) ?: BookingStatus.PENDING,
        paymentStatus = PaymentStatus.fromCode(paymentStatus), hasBride = hasBride, start = start, end = instantOf(appointmentEnd) ?: start,
        respondBy = instantOf(respondBy), personsCount = personsCount.toInt(), total = total, customerName = customer?.name.orEmpty(),
        customerPhone = customer?.phone, staff = staff.map { StaffRef(it.id, it.name) },
    )
    return BookingDetails(
        summary = summary,
        refundStatus = RefundStatus.fromCode(refundStatus),
        persons = persons.map { person ->
            BookingPerson(
                name = person.name, isBride = person.isBride, start = instantOf(person.start), end = instantOf(person.end),
                subtotal = person.subtotal, staff = person.staff?.let { StaffRef(it.id, it.name) },
                services = person.services.map { BookedService(it.name, it.price, it.durationMinutes.toInt()) },
            )
        },
        money = BookingMoney(money.total, money.dueOnline, money.paidOnline, money.remaining, money.refunded),
        policy = policy.mapNotNull { (key, value) -> (value as? JsonPrimitive)?.content?.let { key to it } }.toMap(),
        history = statusHistory.map { StatusChange(BookingStatus.fromCode(it.status), it.actorType, it.reason, instantOf(it.at)) },
        rejectionReason = rejection?.let { it.reasonText ?: it.reasonCode },
        cancellationReason = cancellation?.let { it.reasonText ?: it.reasonCode },
        createdAt = instantOf(createdAt),
        actions = actions.mapNotNull { code -> BookingAction.entries.firstOrNull { it.name == code } }.toSet(),
    )
}

fun GetTeamMembersDataItem.toStaff(): StaffRef = StaffRef(
    id,
    listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(NAME_SEPARATOR),
)
