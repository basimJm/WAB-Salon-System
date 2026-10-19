package com.fab.wab.customer.feature.bookings.domain.model

import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.FullPaymentRefundRule
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.hours

/** Whether the customer may cancel now (BUSINESS_DOMAIN §5.7: PENDING any time, APPROVED before the window). */
sealed interface CancellationRule {
    data object AnyTime : CancellationRule

    /** Allowed until [deadline] (ISO instant). */
    data class Until(val deadline: Instant) : CancellationRule

    /** Too close to the appointment: less than [windowHours] before it. */
    data class WindowPassed(val windowHours: Double) : CancellationRule

    /** Not a cancellable status. */
    data object NotApplicable : CancellationRule
}

/** Money outcome of a customer cancellation (BUSINESS_DOMAIN §5.7/§5.8), shown in the confirmation dialog. */
enum class RefundOutcome { FULL_REFUND, DEPOSIT_KEPT, DEPOSIT_DEDUCTED, NOTHING_PAID }

fun cancellationRuleOf(booking: BookingDetails, now: Instant): CancellationRule = when (booking.status) {
    BookingStatus.PENDING -> CancellationRule.AnyTime
    BookingStatus.APPROVED -> {
        val start = runCatching { Instant.parse(booking.appointmentStart) }.getOrNull()
        val windowHours = booking.policy?.cancellationWindowHours ?: 0.0
        when {
            start == null -> CancellationRule.NotApplicable
            now < start - windowHours.hours -> CancellationRule.Until(start - windowHours.hours)
            else -> CancellationRule.WindowPassed(windowHours)
        }
    }
    else -> CancellationRule.NotApplicable
}

fun refundOutcomeOf(booking: BookingDetails): RefundOutcome {
    if (booking.status == BookingStatus.PENDING) {
        return if (booking.paymentStatus == PaymentStatus.PAY_ON_ARRIVAL) RefundOutcome.NOTHING_PAID else RefundOutcome.FULL_REFUND
    }
    val policy = booking.policy
    return when (booking.paymentMethod) {
        PaymentMethod.PAY_ON_ARRIVAL, PaymentMethod.UNKNOWN -> RefundOutcome.NOTHING_PAID
        PaymentMethod.DEPOSIT ->
            if (policy?.depositRefundableOnCustomerCancel == true) RefundOutcome.FULL_REFUND else RefundOutcome.DEPOSIT_KEPT
        PaymentMethod.FULL_ONLINE -> when (policy?.fullPaymentRefundOnCustomerCancel) {
            FullPaymentRefundRule.MINUS_DEPOSIT ->
                if (policy.depositPercentage != null) RefundOutcome.DEPOSIT_DEDUCTED else RefundOutcome.FULL_REFUND
            FullPaymentRefundRule.FULL, null -> RefundOutcome.FULL_REFUND
        }
    }
}
