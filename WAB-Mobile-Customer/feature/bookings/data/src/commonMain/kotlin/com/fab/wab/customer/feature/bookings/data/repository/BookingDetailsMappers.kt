package com.fab.wab.customer.feature.bookings.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.customer.core.data.contract.generated.GetBookingsByIdDataPersonsItem
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingMoney
import com.fab.wab.customer.core.domain.booking.BookingPerson
import com.fab.wab.customer.core.domain.booking.BookingPolicy
import com.fab.wab.customer.core.domain.booking.BookingReason
import com.fab.wab.customer.core.domain.booking.BookingService
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.FullPaymentRefundRule
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.booking.RefundStatus
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject

/** The policy snapshot is untyped in the contract (`additionalProperties`); this is the salon policy shape. */
@Serializable
internal data class PolicySnapshot(
    val cancellationWindowHours: Double = 0.0,
    val paymentOptions: List<String> = emptyList(),
    val depositPercentage: Double? = null,
    val depositRefundableOnCustomerCancel: Boolean = false,
    val fullPaymentRefundOnCustomerCancel: String? = null,
    val notes: String? = null,
)

private val lenientJson = Json { ignoreUnknownKeys = true; isLenient = true }

/** Null when the snapshot is empty or unreadable: the screen then hides the policy block instead of failing. */
fun JsonObject.toPolicy(): BookingPolicy? {
    if (isEmpty()) return null
    val snapshot = runCatching { lenientJson.decodeFromJsonElement(PolicySnapshot.serializer(), this) }.getOrNull() ?: return null
    return BookingPolicy(
        cancellationWindowHours = snapshot.cancellationWindowHours,
        paymentOptions = snapshot.paymentOptions.map { PaymentMethod.fromCode(it) }.filter { it != PaymentMethod.UNKNOWN },
        depositPercentage = snapshot.depositPercentage,
        depositRefundableOnCustomerCancel = snapshot.depositRefundableOnCustomerCancel,
        fullPaymentRefundOnCustomerCancel = FullPaymentRefundRule.fromCode(snapshot.fullPaymentRefundOnCustomerCancel),
        notes = snapshot.notes?.takeIf { it.isNotBlank() },
    )
}

fun GetBookingsByIdData.toDomain(): BookingDetails = BookingDetails(
    id = id,
    referenceNumber = referenceNumber,
    status = BookingStatus.fromCode(status),
    paymentMethod = PaymentMethod.fromCode(paymentMethod),
    paymentStatus = PaymentStatus.fromCode(paymentStatus),
    refundStatus = RefundStatus.fromCode(refundStatus),
    hasBride = hasBride,
    appointmentStart = appointmentStart,
    appointmentEnd = appointmentEnd,
    salonId = salon?.id,
    salonName = salon?.name,
    branch = branch?.let { bookedBranchOf(it.id, it.name, it.locationText) },
    persons = persons.map { it.toDomain() },
    money = BookingMoney(money.total, money.dueOnline, money.paidOnline, money.remaining, money.refunded, money.paidAtSalon),
    policy = policy.toPolicy(),
    rejection = rejection?.let { BookingReason(it.reasonCode, it.reasonText, it.at) },
    cancellation = cancellation?.let { BookingReason(it.reasonCode, it.reasonText, it.at) },
)

fun GetBookingsByIdDataPersonsItem.toDomain(): BookingPerson = BookingPerson(
    name = name,
    isBride = isBride,
    start = start,
    end = end,
    subtotal = subtotal,
    staffId = staff?.id,
    staffName = staff?.let { member -> member.firstName.ifBlank { member.name } },
    services = services.map { BookingService(it.name, it.price, it.durationMinutes.toInt()) },
    staffPhotoUrl = staff?.photoUrl?.takeIf { it.isNotBlank() },
)
