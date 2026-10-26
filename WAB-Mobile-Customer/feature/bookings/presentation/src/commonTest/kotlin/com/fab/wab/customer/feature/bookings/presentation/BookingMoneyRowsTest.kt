package com.fab.wab.customer.feature.bookings.presentation

import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingMoney
import com.fab.wab.customer.core.domain.booking.BookingReason
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.feature.bookings.presentation.screen.MoneyRow
import com.fab.wab.customer.feature.bookings.presentation.screen.MoneyRowKind
import com.fab.wab.customer.feature.bookings.presentation.screen.cardRejectionOf
import com.fab.wab.customer.feature.bookings.presentation.screen.moneyRowsOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** CUS-093 (SRV-170): S15 money rows (paid at salon once COMPLETED, remaining from the server) and the S14 rejection line. */
class BookingMoneyRowsTest {

    private fun details(status: BookingStatus, refund: RefundStatus = RefundStatus.NONE, money: BookingMoney = MONEY) = BookingDetails(
        id = "b1", referenceNumber = "WAB-1", status = status, paymentMethod = PaymentMethod.DEPOSIT,
        paymentStatus = PaymentStatus.DEPOSIT_PAID, refundStatus = refund, hasBride = false,
        appointmentStart = "2026-10-20T10:00:00Z", appointmentEnd = "2026-10-20T11:00:00Z", salonId = "s1", salonName = "Glow",
        persons = emptyList(), money = money, policy = null, rejection = null, cancellation = null,
    )

    private fun summary(status: BookingStatus, rejection: BookingReason?) = BookingSummary(
        id = "b1", referenceNumber = "WAB-1", status = status, paymentMethod = PaymentMethod.PAY_ON_ARRIVAL,
        paymentStatus = PaymentStatus.PAY_ON_ARRIVAL, hasBride = false, appointmentStart = "2026-10-20T10:00:00Z",
        appointmentEnd = "2026-10-20T11:00:00Z", personsCount = 1, total = "20", salonId = "s1", salonName = "Glow",
        staffNames = emptyList(), rejection = rejection,
    )

    @Test
    fun anOpenBookingShowsTotalAndPaidOnlineOnly() {
        assertEquals(
            listOf(MoneyRow(MoneyRowKind.TOTAL, "120"), MoneyRow(MoneyRowKind.PAID_ONLINE, "25.92")),
            moneyRowsOf(details(BookingStatus.APPROVED)),
        )
    }

    @Test
    fun aCompletedBookingShowsWhatWasPaidAtTheSalon() {
        val completed = details(BookingStatus.COMPLETED, money = MONEY.copy(remaining = "0", paidAtSalon = "94.08"))
        assertEquals(MoneyRow(MoneyRowKind.PAID_AT_SALON, "94.08"), moneyRowsOf(completed).last())
        assertEquals("0", completed.money.remaining, "remaining is the server value (0 once final)")
    }

    @Test
    fun aRefundedBookingShowsTheRefund() {
        val rows = moneyRowsOf(details(BookingStatus.CANCELLED_BY_SALON, refund = RefundStatus.REFUNDED))
        assertEquals(listOf(MoneyRowKind.TOTAL, MoneyRowKind.PAID_ONLINE, MoneyRowKind.REFUNDED), rows.map { it.kind })
    }

    @Test
    fun theCardShowsTheRejectionReasonOnlyWhenRejected() {
        val reason = BookingReason("FULL", "Fully booked", "2026-10-26T10:00:00Z")
        assertEquals(reason, cardRejectionOf(summary(BookingStatus.REJECTED, reason)))
        assertNull(cardRejectionOf(summary(BookingStatus.REJECTED, null)))
        assertNull(cardRejectionOf(summary(BookingStatus.PENDING, reason)))
    }

    private companion object {
        val MONEY = BookingMoney(total = "120", dueOnline = "25.92", paidOnline = "25.92", remaining = "94.08", refunded = "25.92")
    }
}
