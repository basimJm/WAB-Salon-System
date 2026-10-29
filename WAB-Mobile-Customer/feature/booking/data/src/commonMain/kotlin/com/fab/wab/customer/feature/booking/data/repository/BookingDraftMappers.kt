package com.fab.wab.customer.feature.booking.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetBookingsDraftsByIdData
import com.fab.wab.customer.core.data.contract.generated.PostBookingsData
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsBody
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsBodyPersonsItem
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsData
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.CreatedBooking
import com.fab.wab.customer.feature.booking.domain.model.DraftMoney
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.DraftPersonResult
import com.fab.wab.customer.feature.booking.domain.model.DraftPolicy
import com.fab.wab.customer.feature.booking.domain.model.DraftServiceLine
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice

private const val STAFF_ANY = "ANY"

/**
 * Contract 1.3.0 (SRV-151): every `persons[].start` is a required ISO date-time. The flow only reaches the summary
 * after each person picked a slot; a person without one yields `null` so nothing incomplete is ever sent (CUS-088).
 */
fun draftBodyOf(
    salonId: String,
    paymentMethod: PaymentMethod,
    persons: List<DraftPerson>,
    branchId: String? = null,
): PostBookingsDraftsBody? {
    val items = persons.map { person ->
        val start = person.start ?: return null
        PostBookingsDraftsBodyPersonsItem(
            name = person.name.trim(),
            isBride = person.isBride,
            gender = person.gender?.code,
            serviceIds = person.serviceIds,
            staffId = (person.staff as? StaffChoice.Specific)?.staffId,
            start = start,
        )
    }
    return PostBookingsDraftsBody(salonId = salonId, branchId = branchId, paymentMethod = paymentMethod.code, persons = items)
}

fun PostBookingsDraftsData.toDomain(): BookingDraft = BookingDraft(
    id = id,
    salonId = salon.id,
    salonName = salon.name,
    expiresAt = expiresAt,
    paymentMethod = PaymentMethod.fromCode(paymentMethod),
    persons = persons.map {
        DraftPersonResult(
            name = it.name,
            isMain = it.isMain,
            isBride = it.isBride,
            services = it.services.map { s -> DraftServiceLine(s.salonServiceId, s.name, s.price, s.durationMinutes.toInt()) },
            staffFirstName = it.staff.firstName,
            staffIsAny = it.staffSelection.equals(STAFF_ANY, ignoreCase = true),
            start = it.start,
            end = it.end,
            subtotal = it.subtotal,
        )
    },
    money = DraftMoney(money.total, money.deposit, money.dueOnline, money.remaining),
    policy = DraftPolicy(
        cancellationWindowHours = policy.cancellationWindowHours,
        paymentOptions = policy.paymentOptions.map { PaymentMethod.fromCode(it) }.filter { it != PaymentMethod.UNKNOWN },
        depositPercentage = policy.depositPercentage,
        depositRefundableOnCustomerCancel = policy.depositRefundableOnCustomerCancel,
        notes = policy.notes?.takeIf { it.isNotBlank() },
    ),
)

fun GetBookingsDraftsByIdData.toDomain(): BookingDraft = BookingDraft(
    id = id,
    salonId = salon.id,
    salonName = salon.name,
    expiresAt = expiresAt,
    paymentMethod = PaymentMethod.fromCode(paymentMethod),
    persons = persons.map {
        DraftPersonResult(
            name = it.name,
            isMain = it.isMain,
            isBride = it.isBride,
            services = it.services.map { s -> DraftServiceLine(s.salonServiceId, s.name, s.price, s.durationMinutes.toInt()) },
            staffFirstName = it.staff.firstName,
            staffIsAny = it.staffSelection.equals(STAFF_ANY, ignoreCase = true),
            start = it.start,
            end = it.end,
            subtotal = it.subtotal,
        )
    },
    money = DraftMoney(money.total, money.deposit, money.dueOnline, money.remaining),
    policy = DraftPolicy(
        cancellationWindowHours = policy.cancellationWindowHours,
        paymentOptions = policy.paymentOptions.map { PaymentMethod.fromCode(it) }.filter { it != PaymentMethod.UNKNOWN },
        depositPercentage = policy.depositPercentage,
        depositRefundableOnCustomerCancel = policy.depositRefundableOnCustomerCancel,
        notes = policy.notes?.takeIf { it.isNotBlank() },
    ),
)

fun PostBookingsData.toDomain(): CreatedBooking = CreatedBooking(id = id, referenceNumber = referenceNumber, status = status)
