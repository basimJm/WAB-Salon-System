package com.fab.wab.customer.core.realtime

import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RealtimeRefreshTest {
    private fun updated(id: String, status: String, at: String = "t1") = RealtimeEvent(
        RealtimeEvents.BOOKING_UPDATED,
        buildJsonObject { put("id", JsonPrimitive(id)); put("status", JsonPrimitive(status)); put("updatedAt", JsonPrimitive(at)) },
    )

    @Test
    fun entityIdReadsIdOrBookingIdAndIgnoresOtherPayloads() {
        assertEquals("b1", updated("b1", "APPROVED").entityId())
        assertEquals("b2", RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, buildJsonObject { put("bookingId", JsonPrimitive("b2")) }).entityId())
        assertNull(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED).entityId())
        assertNull(RealtimeEvent(RealtimeEvents.NOTIFICATIONS_UNREAD, JsonPrimitive(3)).updateKey())
    }

    @Test
    fun refreshesFilterByNameAndEntityAndDropConsecutiveDuplicates() = runTest {
        val events = flowOf(
            updated("b1", "APPROVED"),
            updated("b1", "APPROVED"),
            RealtimeEvent(RealtimeEvents.NOTIFICATIONS_UNREAD),
            updated("b2", "APPROVED"),
            updated("b1", "COMPLETED"),
            RealtimeEvent(RealtimeEvents.BOOKING_UPDATED),
            RealtimeEvent(RealtimeEvents.BOOKING_UPDATED),
        )
        assertEquals(5, events.refreshesFor(RealtimeEvents.BOOKING_UPDATED).toList().size, "all bookings: 1 duplicate dropped")
        assertEquals(4, events.refreshesFor(RealtimeEvents.BOOKING_UPDATED, entityId = "b1").toList().size, "b1 + the 2 id-less events")
    }
}
