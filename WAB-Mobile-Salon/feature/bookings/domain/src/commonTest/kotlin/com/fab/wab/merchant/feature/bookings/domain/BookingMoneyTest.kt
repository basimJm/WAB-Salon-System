package com.fab.wab.merchant.feature.bookings.domain

import com.fab.wab.merchant.feature.bookings.domain.model.BookingMoney
import com.fab.wab.merchant.feature.bookings.domain.model.isZeroAmount
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** MER-075 (contract 1.6.0): which money rows the details screen shows. */
class BookingMoneyTest {
    @Test
    fun zeroAmountsAreBlankOrAllZero() {
        assertTrue(isZeroAmount("0.000"))
        assertTrue(isZeroAmount("0"))
        assertTrue(isZeroAmount(" "))
        assertFalse(isZeroAmount("0.500"))
        assertFalse(isZeroAmount("12"))
        assertFalse(isZeroAmount("."), "a malformed text stays visible")
    }

    @Test
    fun paidAtSalonAndRefundRowsShowOnlyWhenNonZero() {
        val approved = BookingMoney("25.000", "5.000", "5.000", "20.000", "0.000")
        assertFalse(approved.hasPaidAtSalon, "an older server without paidAtSalon defaults to zero")
        assertFalse(approved.hasRefund)
        val completed = approved.copy(remaining = "0.000", paidAtSalon = "20.000")
        assertTrue(completed.hasPaidAtSalon)
        val rejected = approved.copy(remaining = "0.000", refunded = "5.000")
        assertTrue(rejected.hasRefund)
        assertFalse(rejected.hasPaidAtSalon)
    }
}
