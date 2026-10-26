package com.fab.wab.customer.feature.bookings.presentation

import com.fab.wab.customer.feature.bookings.presentation.screen.staffLineName
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** CUS-092: the customer API sends `staff: null`; S15 must not claim "Any available" for a person who picked someone. */
class BookingStaffLineTest {

    @Test
    fun aKnownStaffNameIsShown() {
        assertEquals("Dana", staffLineName("Dana"))
    }

    @Test
    fun noStaffMeansNoLine() {
        assertNull(staffLineName(null))
        assertNull(staffLineName(" "))
    }
}
