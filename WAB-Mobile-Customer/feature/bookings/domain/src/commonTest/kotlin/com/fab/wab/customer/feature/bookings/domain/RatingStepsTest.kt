package com.fab.wab.customer.feature.bookings.domain

import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingMoney
import com.fab.wab.customer.core.domain.booking.BookingPerson
import com.fab.wab.customer.core.domain.booking.BookingStatus
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.booking.PaymentStatus
import com.fab.wab.customer.core.domain.booking.RefundStatus
import com.fab.wab.customer.feature.bookings.domain.model.RatingStep
import com.fab.wab.customer.feature.bookings.domain.model.ratingStepsOf
import kotlin.test.Test
import kotlin.test.assertEquals

class RatingStepsTest {

    private fun person(staffId: String?, staffName: String?) =
        BookingPerson("Sara", false, "2026-10-18T10:00:00Z", "2026-10-18T11:00:00Z", "10", staffId, staffName, emptyList())

    private fun booking(salonId: String?, persons: List<BookingPerson>) = BookingDetails(
        id = "b1", referenceNumber = "WAB-1", status = BookingStatus.COMPLETED, paymentMethod = PaymentMethod.DEPOSIT,
        paymentStatus = PaymentStatus.DEPOSIT_PAID, refundStatus = RefundStatus.NONE, hasBride = false,
        appointmentStart = "2026-10-18T10:00:00Z", appointmentEnd = "2026-10-18T11:00:00Z", salonId = salonId, salonName = "Glow",
        persons = persons, money = BookingMoney("30", "6", "6", "24", "0"), policy = null, rejection = null, cancellation = null,
    )

    @Test
    fun salonFirstThenDistinctStaffWithIdsOnly() {
        val steps = ratingStepsOf(
            booking("s1", listOf(person("m1", "Lina"), person(null, null), person("m1", "Lina"), person("m2", "Dana"))),
        )
        assertEquals(
            listOf(RatingStep.Salon("s1", "Glow"), RatingStep.Staff("s1", "m1", "Lina"), RatingStep.Staff("s1", "m2", "Dana")),
            steps,
        )
    }

    @Test
    fun deletedSalonHasNothingToRate() {
        assertEquals(emptyList(), ratingStepsOf(booking(null, listOf(person("m1", "Lina")))))
    }
}
