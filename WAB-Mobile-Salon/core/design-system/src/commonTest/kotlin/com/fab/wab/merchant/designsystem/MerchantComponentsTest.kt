package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.booking.PaymentStatus
import com.fab.wab.merchant.core.domain.booking.RefundStatus
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.booking.AgeLabel
import com.fab.wab.merchant.designsystem.components.booking.AgeUnit
import com.fab.wab.merchant.designsystem.components.booking.BookingCardUi
import com.fab.wab.merchant.designsystem.components.booking.Countdown
import com.fab.wab.merchant.designsystem.components.booking.ageLabelOf
import com.fab.wab.merchant.designsystem.components.booking.bookingBadgeTexts
import com.fab.wab.merchant.designsystem.components.booking.bookingStatusTone
import com.fab.wab.merchant.designsystem.components.booking.countdownOf
import com.fab.wab.merchant.designsystem.components.booking.refundTone
import com.fab.wab.merchant.designsystem.components.dashboard.salonStateTexts
import com.fab.wab.merchant.designsystem.components.dashboard.salonStateTone
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.time.Duration
import kotlin.time.Duration.Companion.days
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

class MerchantComponentsTest {
    @Test
    fun statusBadgesFollowTheDesignHues() {
        assertEquals(StatusTone.Warning, bookingStatusTone(BookingStatus.PENDING))
        assertEquals(StatusTone.Success, bookingStatusTone(BookingStatus.APPROVED))
        assertEquals(StatusTone.Accent, bookingStatusTone(BookingStatus.COMPLETED))
        assertEquals(StatusTone.Danger, bookingStatusTone(BookingStatus.REJECTED))
        assertEquals(StatusTone.Danger, bookingStatusTone(BookingStatus.NO_SHOW))
        assertEquals(StatusTone.Neutral, bookingStatusTone(BookingStatus.AUTO_CANCELLED))
        assertNull(refundTone(RefundStatus.NONE))
        assertEquals(StatusTone.Success, refundTone(RefundStatus.REFUNDED))
        assertEquals(StatusTone.Danger, refundTone(RefundStatus.REFUND_FAILED))
        assertEquals(StatusTone.Warning, refundTone(RefundStatus.REFUND_PENDING))
    }

    @Test
    fun everyStatusPaymentAndRefundHasALabel() {
        val needed: List<Enum<*>> = BookingStatus.entries + PaymentStatus.entries + (RefundStatus.entries - RefundStatus.NONE)
        assertEquals(needed.toSet(), bookingBadgeTexts.keys)
        assertEquals(SalonState.entries.toSet(), salonStateTexts.keys)
    }

    @Test
    fun salonStateChipHues() {
        assertEquals(StatusTone.Success, salonStateTone(SalonState.LIVE))
        assertEquals(StatusTone.Danger, salonStateTone(SalonState.OFFLINE))
        assertEquals(StatusTone.Warning, salonStateTone(SalonState.APPROVED_INCOMPLETE))
        assertEquals(StatusTone.Warning, salonStateTone(SalonState.APPLICATION_PENDING))
        assertEquals(StatusTone.Danger, salonStateTone(SalonState.APPLICATION_REJECTED))
    }

    @Test
    fun pendingAgeReadsNowThenMinutesHoursDays() {
        assertEquals(AgeLabel(AgeUnit.NOW, 0), ageLabelOf(Duration.ZERO))
        assertEquals(AgeLabel(AgeUnit.NOW, 0), ageLabelOf(59.seconds))
        assertEquals(AgeLabel(AgeUnit.MINUTES, 1), ageLabelOf(1.minutes))
        assertEquals(AgeLabel(AgeUnit.MINUTES, 59), ageLabelOf(59.minutes + 59.seconds))
        assertEquals(AgeLabel(AgeUnit.HOURS, 1), ageLabelOf(60.minutes))
        assertEquals(AgeLabel(AgeUnit.HOURS, 23), ageLabelOf(1.days - 1.seconds))
        assertEquals(AgeLabel(AgeUnit.DAYS, 2), ageLabelOf(2.days + 5.hours))
    }

    @Test
    fun countdownRoundsMinutesUpAndStopsAtZero() {
        assertEquals(Countdown(6, 50), countdownOf(6.hours + 50.minutes))
        assertEquals(Countdown(0, 1), countdownOf(30.seconds))
        assertEquals(Countdown(1, 0), countdownOf(59.minutes + 1.seconds))
        assertTrue(countdownOf(Duration.ZERO).isDue)
        assertTrue(countdownOf((-5).minutes).isDue)
        assertFalse(countdownOf(1.seconds).isDue)
    }

    @Test
    fun autoCancelLineOnlyForPendingCards() {
        val pending = card(BookingStatus.PENDING, autoCancelIn = 2.hours)
        assertTrue(pending.showsAutoCancel)
        assertFalse(card(BookingStatus.APPROVED, autoCancelIn = 2.hours).showsAutoCancel)
        assertFalse(card(BookingStatus.PENDING, autoCancelIn = null).showsAutoCancel)
    }

    private fun card(status: BookingStatus, autoCancelIn: Duration?) = BookingCardUi(
        id = "b1",
        reference = "WAB-1001",
        customerName = "Sara",
        date = "Today",
        time = "4:00 PM",
        persons = 2,
        staff = "Rana",
        status = status,
        payment = PaymentStatus.DEPOSIT_PAID,
        autoCancelIn = autoCancelIn,
    )
}
