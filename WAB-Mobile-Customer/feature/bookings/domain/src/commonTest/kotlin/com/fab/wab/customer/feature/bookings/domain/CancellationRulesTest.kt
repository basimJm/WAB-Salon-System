package com.fab.wab.customer.feature.bookings.domain

import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingMoney
import com.fab.wab.customer.core.domain.booking.BookingPolicy
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.FullPaymentRefundRule
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.feature.bookings.domain.model.CancellationRule
import com.fab.wab.customer.feature.bookings.domain.model.RefundOutcome
import com.fab.wab.customer.feature.bookings.domain.model.cancellationRuleOf
import com.fab.wab.customer.feature.bookings.domain.model.refundOutcomeOf
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals

private fun policy(
    window: Double = 3.0,
    depositRefundable: Boolean = false,
    full: FullPaymentRefundRule = FullPaymentRefundRule.FULL,
    deposit: Double? = 20.0,
) = BookingPolicy(window, listOf(PaymentMethod.DEPOSIT), deposit, depositRefundable, full, null)

private fun booking(
    status: BookingStatus,
    method: PaymentMethod,
    paymentStatus: PaymentStatus,
    policy: BookingPolicy? = policy(),
) = BookingDetails(
    id = "b1", referenceNumber = "WAB-1", status = status, paymentMethod = method, paymentStatus = paymentStatus,
    refundStatus = RefundStatus.NONE, hasBride = false, appointmentStart = "2026-10-20T10:00:00Z",
    appointmentEnd = "2026-10-20T11:00:00Z", salonId = "s1", salonName = "Glow", persons = emptyList(),
    money = BookingMoney("30", "6", "6", "24", "0"), policy = policy, rejection = null, cancellation = null,
)

private val DEPOSIT_PENDING = booking(BookingStatus.PENDING, PaymentMethod.DEPOSIT, PaymentStatus.DEPOSIT_PAID)
private val DEPOSIT_APPROVED = booking(BookingStatus.APPROVED, PaymentMethod.DEPOSIT, PaymentStatus.DEPOSIT_PAID)
private val ARRIVAL_PENDING = booking(BookingStatus.PENDING, PaymentMethod.PAY_ON_ARRIVAL, PaymentStatus.PAY_ON_ARRIVAL)

class CancellationRulesTest {

    @Test
    fun pendingAnyTimeApprovedWithinWindowOtherwiseNot() {
        val dayBefore = Instant.parse("2026-10-19T10:00:00Z")
        assertEquals(CancellationRule.AnyTime, cancellationRuleOf(DEPOSIT_PENDING, Instant.parse("2026-10-20T09:59:00Z")))
        assertEquals(CancellationRule.Until(Instant.parse("2026-10-20T07:00:00Z")), cancellationRuleOf(DEPOSIT_APPROVED, dayBefore))
        assertEquals(CancellationRule.WindowPassed(3.0), cancellationRuleOf(DEPOSIT_APPROVED, Instant.parse("2026-10-20T08:00:00Z")))
        val completed = booking(BookingStatus.COMPLETED, PaymentMethod.DEPOSIT, PaymentStatus.PAID)
        assertEquals(CancellationRule.NotApplicable, cancellationRuleOf(completed, dayBefore))
    }

    @Test
    fun refundOutcomesFollowThePolicy() {
        assertEquals(RefundOutcome.FULL_REFUND, refundOutcomeOf(DEPOSIT_PENDING))
        assertEquals(RefundOutcome.NOTHING_PAID, refundOutcomeOf(ARRIVAL_PENDING))
        assertEquals(RefundOutcome.DEPOSIT_KEPT, refundOutcomeOf(DEPOSIT_APPROVED))
        val refundablePolicy = policy(depositRefundable = true)
        val refundable = booking(BookingStatus.APPROVED, PaymentMethod.DEPOSIT, PaymentStatus.DEPOSIT_PAID, refundablePolicy)
        assertEquals(RefundOutcome.FULL_REFUND, refundOutcomeOf(refundable))
        val minus = policy(full = FullPaymentRefundRule.MINUS_DEPOSIT)
        val fullPaid = booking(BookingStatus.APPROVED, PaymentMethod.FULL_ONLINE, PaymentStatus.FULLY_PAID, minus)
        assertEquals(RefundOutcome.DEPOSIT_DEDUCTED, refundOutcomeOf(fullPaid))
        val noDeposit = policy(full = FullPaymentRefundRule.MINUS_DEPOSIT, deposit = null)
        val fullPaidNoDeposit = booking(BookingStatus.APPROVED, PaymentMethod.FULL_ONLINE, PaymentStatus.FULLY_PAID, noDeposit)
        assertEquals(RefundOutcome.FULL_REFUND, refundOutcomeOf(fullPaidNoDeposit))
        val arrival = booking(BookingStatus.APPROVED, PaymentMethod.PAY_ON_ARRIVAL, PaymentStatus.PAY_ON_ARRIVAL)
        assertEquals(RefundOutcome.NOTHING_PAID, refundOutcomeOf(arrival))
    }
}
