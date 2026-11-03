package com.fab.wab.customer.feature.bookings.presentation

import com.fab.wab.customer.core.domain.booking.BookingSource
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookedBy
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.CardAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.bookedByOf
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.cardActionsOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** CUS-104 (BUSINESS_DOMAIN §5.20, §5.22): "Booked by <place>" and the completed card's Rate + Book again. */
class BookingCardRulesTest {

    private val completed = BookingSummary(
        id = "b1", referenceNumber = "WAB-1", status = BookingStatus.COMPLETED, paymentMethod = PaymentMethod.PAY_ON_ARRIVAL,
        paymentStatus = PaymentStatus.PAY_ON_ARRIVAL, hasBride = false, appointmentStart = "2026-10-18T10:00:00Z",
        appointmentEnd = "2026-10-18T11:00:00Z", personsCount = 1, total = "20", salonId = "s1", salonName = "Ink House",
        staffNames = emptyList(),
    )

    @Test
    fun completedBookingsOfferRateForRegisteredCustomersAndBookAgain() {
        assertEquals(listOf(CardAction.RATE, CardAction.BOOK_AGAIN), cardActionsOf(completed, signedIn = true))
        assertEquals(listOf(CardAction.BOOK_AGAIN), cardActionsOf(completed, signedIn = false), "only registered customers rate")
        assertEquals(listOf(CardAction.RATE), cardActionsOf(completed.copy(salonId = null), signedIn = true))
        BookingStatus.entries.filter { it != BookingStatus.COMPLETED }.forEach {
            assertEquals(emptyList(), cardActionsOf(completed.copy(status = it), signedIn = true), "$it")
        }
    }

    @Test
    fun onlyMerchantBookingsAreLabelledBookedByThePlace() {
        val branch = BranchRef("br1", "Abdoun")
        assertEquals(BookedBy("Ink House", "Abdoun"), bookedByOf(BookingSource.MERCHANT, "Ink House", branch))
        assertEquals(BookedBy("Ink House", null), bookedByOf(BookingSource.MERCHANT, "Ink House", BranchRef("br1", " ")))
        assertNull(bookedByOf(BookingSource.CUSTOMER_APP, "Ink House", branch))
        assertNull(bookedByOf(BookingSource.MERCHANT, " ", branch), "no place, no label")
        assertEquals(BookingSource.MERCHANT, BookingSource.fromCode("merchant"))
        assertEquals(BookingSource.CUSTOMER_APP, BookingSource.fromCode(null))
    }
}
