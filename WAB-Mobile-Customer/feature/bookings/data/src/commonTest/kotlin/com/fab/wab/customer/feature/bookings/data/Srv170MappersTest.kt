package com.fab.wab.customer.feature.bookings.data

import com.fab.wab.customer.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.customer.core.data.contract.generated.GetBookingsByIdDataPersonsItemStaff
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItemRejection
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.core.domain.booking.BookingReason
import com.fab.wab.customer.feature.bookings.data.repository.toDomain
import kotlinx.serialization.builtins.ListSerializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** CUS-093: customer contract 1.5.0 (SRV-170) — staff per person, paid at salon, rejection on the list row. */
class Srv170MappersTest {

    private val details = decodeFixture("GetBookingsById", GetBookingsByIdData.serializer()).data
    private val row = decodeFixture("GetBookings", ListSerializer(GetBookingsDataItem.serializer())).data.first()

    @Test
    fun eachPersonCarriesTheStaffFirstNameAndPhoto() {
        val person = details.persons.first()
        val withPhoto = details.copy(
            persons = listOf(person.copy(staff = GetBookingsByIdDataPersonsItemStaff("m1", "Dana Saleh", "Dana", "photos/m1.jpg"))),
        ).toDomain().persons.single()
        assertEquals("m1", withPhoto.staffId)
        assertEquals("Dana", withPhoto.staffName)
        assertEquals("photos/m1.jpg", withPhoto.staffPhotoUrl)

        val blankPhoto = details.copy(
            persons = listOf(person.copy(staff = GetBookingsByIdDataPersonsItemStaff("m1", "Dana Saleh", " ", " "))),
        ).toDomain().persons.single()
        assertEquals("Dana Saleh", blankPhoto.staffName, "falls back to the full name when the first name is blank")
        assertNull(blankPhoto.staffPhotoUrl)

        val anyAvailable = details.copy(persons = listOf(person.copy(staff = null))).toDomain().persons.single()
        assertNull(anyAvailable.staffName)
    }

    @Test
    fun moneyCarriesWhatWasPaidAtTheSalon() {
        val money = details.copy(money = details.money.copy(remaining = "0", paidAtSalon = "94.08")).toDomain().money
        assertEquals("0", money.remaining)
        assertEquals("94.08", money.paidAtSalon)
    }

    @Test
    fun theListRowCarriesTheRejectionReason() {
        val reason = GetBookingsDataItemRejection("FULL", "Fully booked", "2026-10-26T10:00:00Z")
        val rejected = row.copy(status = "REJECTED", rejection = reason)
        assertEquals(BookingReason("FULL", "Fully booked", "2026-10-26T10:00:00Z"), rejected.toDomain().rejection)
        assertNull(row.copy(rejection = null).toDomain().rejection)
    }
}
