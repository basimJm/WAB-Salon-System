package com.fab.wab.merchant.core.realtime

import com.fab.wab.merchant.core.realtime.socketio.EngineIoPacket
import com.fab.wab.merchant.core.realtime.socketio.SocketIoPacket
import com.fab.wab.merchant.core.realtime.socketio.SocketIoProtocol
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
        assertEquals("""40/merchant,{"token":"t1"}""", protocol.encodeConnect("/merchant", "t1"))
        assertEquals("""40{"token":"t1"}""", protocol.encodeConnect("/", "t1"))
        val payload = buildJsonObject { put("a", JsonPrimitive(1)) }
        assertEquals("""42/merchant,["ping",{"a":1}]""", protocol.encodeEvent("/merchant", "ping", payload))
    }

    @Test
    fun socketPacketsAreDecodedWithNamespaceAndPayload() {
        assertEquals(SocketIoPacket.Connected("/merchant"), socket("""40/merchant,{"sid":"s"}"""))
        assertEquals(SocketIoPacket.Disconnect("/merchant"), socket("41/merchant,"))
        val event = socket("""42/merchant,7["entity.updated",{"id":"b1"}]""")
        assertIs<SocketIoPacket.Event>(event)
        assertEquals("entity.updated", event.name)
        assertEquals("b1", event.payload.jsonObject["id"]?.jsonPrimitive?.content)
        val error = socket("""44/merchant,{"message":"UNAUTHORIZED","data":{"code":"UNAUTHORIZED"}}""")
        assertEquals(SocketIoPacket.ConnectError("/merchant", "UNAUTHORIZED"), error)
        assertEquals(SocketIoPacket.ConnectError("/", "boom"), socket("""44{"message":"boom"}"""))
        assertIs<SocketIoPacket.Unknown>(socket("42/merchant,not-json"))
    }

    private fun socket(frame: String): SocketIoPacket = (protocol.decode(frame) as EngineIoPacket.Message).packet
}
