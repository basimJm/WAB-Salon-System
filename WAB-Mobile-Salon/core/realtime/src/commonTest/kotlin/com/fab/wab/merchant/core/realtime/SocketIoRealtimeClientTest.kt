package com.fab.wab.merchant.core.realtime

import com.fab.wab.merchant.core.realtime.socketio.SocketIoRealtimeClient
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val OPEN_FRAME = """0{"sid":"s1","pingInterval":100,"pingTimeout":50}"""
private const val CONNECTED_FRAME = """40/merchant,{"sid":"n1"}"""
private const val UNAUTHORIZED_FRAME = """44/merchant,{"message":"UNAUTHORIZED","data":{"code":"UNAUTHORIZED"}}"""
private const val EVENT_FRAME = """42/merchant,["booking.updated",{"id":"b1"}]"""
private const val PING_BUDGET_MS = 150L

@OptIn(ExperimentalCoroutinesApi::class)
class SocketIoRealtimeClientTest {

    private val transport = FakeTransport()
    private var token: String? = "access-1"

    private fun TestScope.client() = SocketIoRealtimeClient(
        config = RealtimeConfig("https://api.example"),
        transport = transport,
        accessToken = { token },
        scope = backgroundScope,
    )

    @Test
    fun handshakeConnectsAndDeliversEvents() = runTest {
        val client = client()
        val received = mutableListOf<RealtimeEvent>()
        backgroundScope.launch { client.events.collect { received += it } }
        client.connect()
        testScheduler.runCurrent()
        val connection = transport.connections.single()
        assertEquals(RealtimeStatus.Connecting, client.status.value)
        connection.push(OPEN_FRAME)
        testScheduler.runCurrent()
        assertEquals(listOf("""40/merchant,{"token":"access-1"}"""), connection.sent)
        connection.push(CONNECTED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Connected, client.status.value)
        connection.push("2")
        connection.push(EVENT_FRAME)
        testScheduler.runCurrent()
        assertEquals("3", connection.sent.last())
        assertEquals(RealtimeEvents.BOOKING_UPDATED, received.single().name)
        assertEquals("b1", received.single().payload.jsonObject["id"]?.jsonPrimitive?.content)
        client.disconnect()
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Disconnected, client.status.value)
        assertTrue(connection.closed)
    }

    @Test
    fun unauthorizedStopsWithoutRetry() = runTest {
        val client = client()
        client.connect()
        testScheduler.runCurrent()
        transport.connections.single().push(OPEN_FRAME)
        transport.connections.single().push(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Unauthorized, client.status.value)
        testScheduler.advanceTimeBy(RealtimeDefaults.RECONNECT_MAX_DELAY_MS * 2)
        assertEquals(1, transport.connections.size)
        token = null
        client.connect()
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Unauthorized, client.status.value)
        assertEquals(1, transport.connections.size)
    }

    @Test
    fun droppedAndSilentConnectionsReconnectWithBackoff() = runTest {
        val client = client()
        client.connect()
        testScheduler.runCurrent()
        transport.connections[0].push(OPEN_FRAME)
        transport.connections[0].push(CONNECTED_FRAME)
        testScheduler.runCurrent()
        transport.connections[0].dropFromServer()
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Reconnecting, client.status.value)
        assertEquals(1, transport.connections.size)
        testScheduler.advanceTimeBy(RealtimeDefaults.RECONNECT_BASE_DELAY_MS + 1)
        testScheduler.runCurrent()
        assertEquals(2, transport.connections.size)
        transport.connections[1].push(OPEN_FRAME)
        transport.connections[1].push(CONNECTED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Connected, client.status.value)
        testScheduler.advanceTimeBy(PING_BUDGET_MS + 1)
        testScheduler.runCurrent()
        assertTrue(transport.connections[1].closed)
        assertEquals(RealtimeStatus.Reconnecting, client.status.value)
        testScheduler.advanceTimeBy(RealtimeDefaults.RECONNECT_BASE_DELAY_MS * RealtimeDefaults.RECONNECT_FACTOR + 1)
        testScheduler.runCurrent()
        assertEquals(3, transport.connections.size)
        assertEquals("wss://api.example/socket.io/?EIO=4&transport=websocket", transport.urls.first())
    }

    @Test
    fun fakeClientIsScriptable() = runTest {
        val fake = FakeRealtimeClient()
        assertNull(fake.events.replayCache.firstOrNull())
        fake.connect()
        assertEquals(RealtimeStatus.Connected, fake.status.value)
        val collected = backgroundScope.launch { fake.events.first { it.name == RealtimeEvents.NOTIFICATIONS_UNREAD } }
        testScheduler.runCurrent()
        assertTrue(fake.emit(RealtimeEvent(RealtimeEvents.NOTIFICATIONS_UNREAD)))
        testScheduler.runCurrent()
        assertTrue(collected.isCompleted)
        fake.disconnect()
        assertEquals(RealtimeStatus.Disconnected, fake.status.value)
    }
}
