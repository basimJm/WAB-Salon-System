package com.fab.wab.customer.core.realtime

import com.fab.wab.customer.core.realtime.socketio.EngineIoPacket
import com.fab.wab.customer.core.realtime.socketio.SocketIoPacket
import com.fab.wab.customer.core.realtime.socketio.SocketIoProtocol
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class SocketIoProtocolTest {

    private val protocol = SocketIoProtocol()

    @Test
    fun engineFramesAreDecoded() {
        val open = protocol.decode("""0{"sid":"abc","pingInterval":25000,"pingTimeout":20000}""")
        assertEquals(EngineIoPacket.Open(25_000, 20_000), open)
        assertEquals(EngineIoPacket.Open(null, null), protocol.decode("0"))
        assertEquals(EngineIoPacket.Ping, protocol.decode("2"))
        assertEquals(EngineIoPacket.Pong, protocol.decode("3"))
        assertEquals(EngineIoPacket.Close, protocol.decode("1"))
        assertEquals(EngineIoPacket.Unknown("x"), protocol.decode("x"))
        assertEquals("3", protocol.encodePong())
    }

    @Test
    fun namespaceConnectCarriesTheToken() {
        assertEquals("""40/customer,{"token":"t1"}""", protocol.encodeConnect("/customer", "t1"))
        assertEquals("""40{"token":"t1"}""", protocol.encodeConnect("/", "t1"))
        val payload = buildJsonObject { put("a", JsonPrimitive(1)) }
        assertEquals("""42/customer,["ping",{"a":1}]""", protocol.encodeEvent("/customer", "ping", payload))
    }

    @Test
    fun socketPacketsAreDecodedWithNamespaceAndPayload() {
        assertEquals(SocketIoPacket.Connected("/customer"), socket("""40/customer,{"sid":"s"}"""))
        assertEquals(SocketIoPacket.Disconnect("/customer"), socket("41/customer,"))
        val event = socket("""42/customer,7["booking.updated",{"id":"b1"}]""")
        assertIs<SocketIoPacket.Event>(event)
        assertEquals("booking.updated", event.name)
        assertEquals("b1", event.payload.jsonObject["id"]?.jsonPrimitive?.content)
        val error = socket("""44/customer,{"message":"UNAUTHORIZED","data":{"code":"UNAUTHORIZED"}}""")
        assertEquals(SocketIoPacket.ConnectError("/customer", "UNAUTHORIZED"), error)
        assertEquals(SocketIoPacket.ConnectError("/", "boom"), socket("""44{"message":"boom"}"""))
        assertIs<SocketIoPacket.Unknown>(socket("42/customer,not-json"))
    }

    /** Frames observed on the local real stack (CUS-060): book → `booking.updated` summary + `notifications.unread`. */
    @Test
    fun realServerFramesDecodeToTheEventsTheScreensUse() {
        val booking = socket(
            """42/customer,["booking.updated",{"id":"6ade3cfcc2cfb0cb993a1726","referenceNumber":"WAB-Z4JSMB","status":"PENDING",""" +
                """"paymentStatus":"PAY_ON_ARRIVAL","hasBride":false,"appointmentStart":"2026-10-30T08:00:00.000Z",""" +
                """"appointmentEnd":"2026-10-30T09:00:00.000Z","respondBy":"2026-10-30T09:00:00.000Z",""" +
                """"total":"49.000","personsCount":1}]""",
        )
        assertIs<SocketIoPacket.Event>(booking)
        assertEquals(RealtimeEvents.BOOKING_UPDATED, booking.name)
        assertEquals("6ade3cfcc2cfb0cb993a1726", RealtimeEvent(booking.name, booking.payload).entityId())
        val unread = socket("""42/customer,["notifications.unread",{"count":2}]""")
        assertIs<SocketIoPacket.Event>(unread)
        assertEquals(RealtimeEvents.NOTIFICATIONS_UNREAD, unread.name)
        assertEquals("2", unread.payload.jsonObject["count"]?.jsonPrimitive?.content)
    }

    private fun socket(frame: String): SocketIoPacket = (protocol.decode(frame) as EngineIoPacket.Message).packet
}
