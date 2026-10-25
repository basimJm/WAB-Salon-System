package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.notification.push.PushNotification
import com.fab.wab.merchant.core.realtime.FakeRealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeEvent
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import com.fab.wab.merchant.feature.bookings.presentation.di.bookingChanges
import com.fab.wab.merchant.feature.bookings.presentation.di.bookingId
import com.fab.wab.merchant.feature.bookings.presentation.di.bookingRequests
import com.fab.wab.merchant.feature.bookings.presentation.di.bookingUpdates
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

@OptIn(ExperimentalCoroutinesApi::class)
class BookingSignalsTest {

    @Test
    fun bookingIdIsReadFromTheKnownPayloadKeys() {
        assertEquals("b1", RealtimeEvent(RealtimeEvents.BOOKING_REQUESTED, buildJsonObject { put("bookingId", "b1") }).bookingId())
        assertEquals("b2", RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, buildJsonObject { put("id", "b2") }).bookingId())
        assertEquals("b3", RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, buildJsonObject { put("_id", "b3") }).bookingId())
        assertNull(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, JsonPrimitive("b4")).bookingId())
        assertNull(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, buildJsonObject { put("id", "") }).bookingId())
    }

    @Test
    fun requestsMergeSocketAndPushAndUpdatesOnlyTheirEvent() = runTest(UnconfinedTestDispatcher()) {
        val realtime = FakeRealtimeClient()
        val pushes = MutableSharedFlow<PushNotification>(extraBufferCapacity = 1)
        val requests = mutableListOf<String>()
        val updates = mutableListOf<String>()
        backgroundScope.launch { bookingRequests(realtime, pushes).collect { requests += it } }
        backgroundScope.launch { bookingUpdates(realtime).collect { updates += it } }
        realtime.emit(RealtimeEvent(RealtimeEvents.BOOKING_REQUESTED, buildJsonObject { put("bookingId", "s1") }))
        realtime.emit(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, buildJsonObject { put("id", "u1") }))
        pushes.emit(PushNotification("t", "m", mapOf(PushKeys.EVENT to RealtimeEvents.BOOKING_REQUESTED, PushKeys.BOOKING_ID to "p1")))
        pushes.emit(PushNotification("t", "m", mapOf(PushKeys.EVENT to "booking.reminder_1h", PushKeys.BOOKING_ID to "p2")))
        assertEquals(listOf("s1", "p1"), requests)
        assertEquals(listOf("u1"), updates)
    }

    @Test
    fun aChangeHeardThroughTwoRoomsReachesTheScreensOnce() = runTest(UnconfinedTestDispatcher()) {
        val realtime = FakeRealtimeClient()
        val updates = mutableListOf<String>()
        var reloads = 0
        backgroundScope.launch { bookingUpdates(realtime).collect { updates += it } }
        backgroundScope.launch { bookingChanges(realtime).collect { reloads++ } }
        val approved = RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, buildJsonObject { put("id", "u1"); put("status", "APPROVED") })
        realtime.emit(approved)
        realtime.emit(approved)
        val cancelled = buildJsonObject { put("id", "u1"); put("status", "CANCELLED_BY_SALON") }
        realtime.emit(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, cancelled))
        assertEquals(listOf("u1", "u1"), updates)
        assertEquals(2, reloads)
    }
}
