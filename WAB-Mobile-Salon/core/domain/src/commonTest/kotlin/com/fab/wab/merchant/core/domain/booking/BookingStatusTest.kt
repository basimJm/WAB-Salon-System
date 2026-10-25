package com.fab.wab.merchant.core.domain.booking

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.time.Duration
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes

class BookingStatusTest {
    @Test
    fun codesMatchTheContract() {
        assertEquals(BookingStatus.CANCELLED_BY_SALON, BookingStatus.fromCode(" cancelled_by_salon "))
        assertEquals(PaymentStatus.DEPOSIT_PAID, PaymentStatus.fromCode("DEPOSIT_PAID"))
        assertEquals(RefundStatus.REFUND_FAILED, RefundStatus.fromCode("REFUND_FAILED"))
        assertEquals(8, BookingStatus.entries.size)
    }

    @Test
    fun unknownCodesAreSafe() {
        assertNull(BookingStatus.fromCode("ARCHIVED"))
        assertNull(PaymentStatus.fromCode(null))
        assertEquals(RefundStatus.NONE, RefundStatus.fromCode(null))
        assertEquals(RefundStatus.NONE, RefundStatus.fromCode("SOMETHING_NEW"))
    }

    @Test
    fun pendingAgeIsElapsedTimeAndNeverNegative() {
        val created = 1_000_000L
        assertEquals(5.minutes, BookingTimers.pendingAge(created, created + 5.minutes.inWholeMilliseconds))
        assertEquals(Duration.ZERO, BookingTimers.pendingAge(created, created - 1_000L))
    }

    @Test
    fun autoCancelCountsDownToZero() {
        val respondBy = 10.hours.inWholeMilliseconds
        val now = respondBy - (6.hours + 50.minutes).inWholeMilliseconds
        assertEquals(6.hours + 50.minutes, BookingTimers.autoCancelRemaining(respondBy, now))
        assertEquals(Duration.ZERO, BookingTimers.autoCancelRemaining(respondBy, respondBy + 1L))
    }
}
