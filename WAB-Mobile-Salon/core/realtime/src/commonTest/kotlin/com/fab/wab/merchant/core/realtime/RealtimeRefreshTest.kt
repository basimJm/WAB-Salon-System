package com.fab.wab.merchant.core.realtime

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
        RealtimeEvents.ENTITY_UPDATED,
        buildJsonObject { put("id", JsonPrimitive(id)); put("status", JsonPrimitive(status)); put("updatedAt", JsonPrimitive(at)) },
    )

    @Test
    fun entityIdReadsIdAndIgnoresOtherPayloads() {
        assertEquals("b1", updated("b1", "APPROVED").entityId())
        assertNull(RealtimeEvent(RealtimeEvents.ENTITY_UPDATED).entityId())
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
            RealtimeEvent(RealtimeEvents.ENTITY_UPDATED),
            RealtimeEvent(RealtimeEvents.ENTITY_UPDATED),
        )
        assertEquals(5, events.refreshesFor(RealtimeEvents.ENTITY_UPDATED).toList().size, "all entities: 1 duplicate dropped")
        assertEquals(4, events.refreshesFor(RealtimeEvents.ENTITY_UPDATED, entityId = "b1").toList().size, "b1 + the 2 id-less events")
    }
}
