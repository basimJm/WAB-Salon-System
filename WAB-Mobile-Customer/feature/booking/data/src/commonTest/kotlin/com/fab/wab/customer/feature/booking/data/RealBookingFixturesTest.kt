package com.fab.wab.customer.feature.booking.data

import com.fab.wab.customer.core.data.contract.generated.PostBookingsData
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsData
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdAvailabilityData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.feature.booking.data.repository.availabilityBodyOf
import com.fab.wab.customer.feature.booking.data.repository.toDomain
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** CUS-060: the booking flow on responses captured from the real server (availability, draft, booking). */
class RealBookingFixturesTest {

    @Test
    fun realAvailabilityMapsIsoSlotsWithEnds() {
        val day = decodeFixture("PostSalonsBySalonIdAvailability", PostSalonsBySalonIdAvailabilityData.serializer()).data.toDomain()
        assertTrue(day.slots.isNotEmpty())
        assertTrue(day.durationMinutes > 0)
        val slot = day.slots.first()
        assertTrue(slot.start.endsWith("Z") && slot.end > slot.start, "slots are UTC instants: $slot")
    }

    @Test
    fun realDraftAndBookingMap() {
        val draft = decodeFixture("PostBookingsDrafts", PostBookingsDraftsData.serializer()).data
        assertNotNull(draft.branch, "the real draft carries the booked branch")
        assertEquals(draft.id, draft.toDomain().id)
        val booking = decodeFixture("PostBookings", PostBookingsData.serializer()).data.toDomain()
        assertTrue(booking.referenceNumber.isNotBlank())
    }

    /** The server rejects an `others` pick without `end` (VALIDATION_ERROR); picks without a slot are not sent. */
    @Test
    fun otherPersonsAreSentWithStartAndEnd() {
        val me = DraftPerson(name = "Sara", serviceIds = listOf("a"))
        val picked = DraftPerson(
            name = "Lina", serviceIds = listOf("b"), start = START, end = END, staff = StaffChoice.Specific("m1", "Noor"),
        )
        val noSlot = picked.copy(start = null, end = null)
        val anyStaff = picked.copy(staff = StaffChoice.Any)
        val body = availabilityBodyOf("2026-10-29", me, listOf(picked, noSlot, anyStaff), draftId = null)
        val other = body.others.orEmpty().single()
        assertEquals("m1", other.staffId)
        assertEquals(START, other.start)
        assertEquals(END, other.end)
        assertNull(availabilityBodyOf("2026-10-29", me, listOf(noSlot), draftId = null).others)
    }

    private companion object {
        const val START = "2026-10-29T08:00:00.000Z"
        const val END = "2026-10-29T09:00:00.000Z"
    }
}
