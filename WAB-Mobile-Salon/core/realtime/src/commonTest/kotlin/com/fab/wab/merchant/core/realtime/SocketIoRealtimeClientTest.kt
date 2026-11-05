package com.fab.wab.merchant.core.realtime

import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.auth.TokenRefreshResult
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
private const val REQUEST_FRAME = """42/merchant,["booking.requested",{"id":"b2"}]"""
private const val PING_BUDGET_MS = 150L

@OptIn(ExperimentalCoroutinesApi::class)
class SocketIoRealtimeClientTest {

    private val transport = FakeTransport()
    private var token: String? = "access-1"

    /** The access tokens the client presented for a refresh (the ones the server refused), in order. */
    private val refreshed = mutableListOf<String>()

    /** What the backend answers to a refresh; the stored token is rotated like the real coordinator does. */
    private var refreshOutcome: (rejected: String) -> TokenRefreshResult = { rejected ->
        val next = "access-${refreshed.size + 1}"
        token = next
        TokenRefreshResult.Refreshed(AuthTokens(next, "refresh-${refreshed.size}"))
    }

    private fun TestScope.client() = SocketIoRealtimeClient(
        config = RealtimeConfig("https://api.example"),
        transport = transport,
        accessToken = { token },
        refreshAfterUnauthorized = { rejected ->
            refreshed += rejected
            refreshOutcome(rejected)
        },
        scope = backgroundScope,
    )

    private fun FakeConnection.handshakeAnswers(vararg frames: String) {
        push(OPEN_FRAME)
        frames.forEach(::push)
    }

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
    fun anExpiredTokenIsRefreshedOnceAndTheSocketReconnectsWithTheNewTokenAndDeliversTheRequest() = runTest {
        val client = client()
        val received = mutableListOf<RealtimeEvent>()
        backgroundScope.launch { client.events.collect { received += it } }
        client.connect()
        testScheduler.runCurrent()
        transport.connections[0].handshakeAnswers(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        assertEquals(listOf("access-1"), refreshed, "the refused token is what the refresh is told")
        assertEquals(2, transport.connections.size, "reconnects at once, no backoff after a successful refresh")
        assertTrue(transport.connections[0].closed)
        transport.connections[1].handshakeAnswers(CONNECTED_FRAME, REQUEST_FRAME)
        testScheduler.runCurrent()
        assertEquals(listOf("""40/merchant,{"token":"access-2"}"""), transport.connections[1].sent)
        assertEquals(RealtimeStatus.Connected, client.status.value)
        assertEquals(RealtimeEvents.BOOKING_REQUESTED, received.single().name, "the live request is delivered after the refresh")
        assertEquals(1, refreshed.size)
    }

    @Test
    fun aRejectedRefreshStopsTheClientUntilTheNextConnect() = runTest {
        refreshOutcome = { TokenRefreshResult.Rejected }
        val client = client()
        client.connect()
        testScheduler.runCurrent()
        transport.connections.single().handshakeAnswers(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Unauthorized, client.status.value)
        testScheduler.advanceTimeBy(RealtimeDefaults.RECONNECT_MAX_DELAY_MS * 2)
        assertEquals(1, transport.connections.size)
        assertEquals(1, refreshed.size)
        token = null
        client.connect()
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Unauthorized, client.status.value)
        assertEquals(1, transport.connections.size)
        assertEquals(1, refreshed.size, "no stored token: nothing to refresh")
    }

    @Test
    fun aRefreshThatCannotReachTheBackendRetriesWithBackoffInsteadOfStopping() = runTest {
        var reachable = false
        refreshOutcome = { rejected ->
            if (reachable) {
                token = "access-2"
                TokenRefreshResult.Refreshed(AuthTokens("access-2", "refresh-2"))
            } else {
                TokenRefreshResult.Unavailable
            }
        }
        val client = client()
        client.connect()
        testScheduler.runCurrent()
        transport.connections[0].handshakeAnswers(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Reconnecting, client.status.value)
        assertEquals(1, transport.connections.size)
        reachable = true
        testScheduler.advanceTimeBy(RealtimeDefaults.RECONNECT_BASE_DELAY_MS + 1)
        testScheduler.runCurrent()
        transport.connections[1].handshakeAnswers(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        assertEquals(listOf("access-1", "access-1"), refreshed)
        assertEquals(3, transport.connections.size)
        transport.connections[2].handshakeAnswers(CONNECTED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Connected, client.status.value)
        assertEquals("""40/merchant,{"token":"access-2"}""", transport.connections[2].sent.single())
    }

    @Test
    fun aFreshTokenRefusedAgainStopsInsteadOfLoopingOnRefreshes() = runTest {
        val client = client()
        client.connect()
        testScheduler.runCurrent()
        transport.connections[0].handshakeAnswers(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        transport.connections[1].handshakeAnswers(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Unauthorized, client.status.value)
        testScheduler.advanceTimeBy(RealtimeDefaults.RECONNECT_MAX_DELAY_MS * 2)
        assertEquals(2, transport.connections.size)
        assertEquals(1, refreshed.size)
    }

    @Test
    fun aLaterExpiryAfterAHealthySessionRefreshesAgain() = runTest {
        val client = client()
        client.connect()
        testScheduler.runCurrent()
        transport.connections[0].handshakeAnswers(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        transport.connections[1].handshakeAnswers(CONNECTED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Connected, client.status.value)
        transport.connections[1].dropFromServer()
        testScheduler.runCurrent()
        testScheduler.advanceTimeBy(RealtimeDefaults.RECONNECT_BASE_DELAY_MS + 1)
        testScheduler.runCurrent()
        // The stored token expired while the socket lived: the next handshake is refused and refreshed once more.
        transport.connections[2].handshakeAnswers(UNAUTHORIZED_FRAME)
        testScheduler.runCurrent()
        assertEquals(listOf("access-1", "access-2"), refreshed)
        assertEquals(4, transport.connections.size)
        transport.connections[3].handshakeAnswers(CONNECTED_FRAME)
        testScheduler.runCurrent()
        assertEquals(RealtimeStatus.Connected, client.status.value)
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
