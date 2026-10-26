package com.fab.wab.customer.feature.bookings.presentation

import com.fab.wab.customer.core.domain.booking.BookingReason
import com.fab.wab.customer.feature.bookings.presentation.screen.ReasonDisplay
import com.fab.wab.customer.feature.bookings.presentation.screen.reasonDisplayOf
import kotlin.test.Test
import kotlin.test.assertEquals

/** CUS-092: after a customer cancel S15 printed the raw code "CUSTOMER_REQUEST" as the reason. */
class BookingReasonTextTest {

    private fun reason(code: String, text: String?) = BookingReason(code = code, text = text, at = "2026-10-26T14:00:00.000Z")

    @Test
    fun writtenTextWins() {
        assertEquals(ReasonDisplay.Written("Fully booked"), reasonDisplayOf(reason("FULLY_BOOKED", " Fully booked ")))
    }

    @Test
    fun customerCancelWithoutTextIsLocalized() {
        assertEquals(ReasonDisplay.CustomerRequest, reasonDisplayOf(reason("CUSTOMER_REQUEST", null)))
    }

    @Test
    fun unknownCodeWithoutTextNeverShowsTheCode() {
        assertEquals(ReasonDisplay.NotGiven, reasonDisplayOf(reason("OTHER", "")))
        assertEquals(ReasonDisplay.NotGiven, reasonDisplayOf(reason("ADMIN_ACTION", null)))
    }
}
