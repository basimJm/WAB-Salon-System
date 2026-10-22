package com.fab.wab.customer.core.realtime

import com.fab.wab.customer.core.realtime.socketio.RealtimeConnection
import com.fab.wab.customer.core.realtime.socketio.RealtimeTransport
import kotlinx.coroutines.channels.Channel

/** In-memory server side of one WebSocket: the test pushes frames in and reads what the client sent. */
class FakeConnection : RealtimeConnection {
    private val inbound = Channel<String?>(Channel.UNLIMITED)
    val sent = mutableListOf<String>()
    var closed = false
        private set

    fun push(frame: String) {
        inbound.trySend(frame)
    }

    fun dropFromServer() {
        inbound.trySend(null)
    }

    override suspend fun receive(): String? = inbound.receive()

    override suspend fun send(text: String) {
        sent += text
    }

    override suspend fun close() {
        closed = true
    }
}

class FakeTransport : RealtimeTransport {
    val connections = mutableListOf<FakeConnection>()
    val urls = mutableListOf<String>()

    override suspend fun open(url: String): RealtimeConnection {
        urls += url
        return FakeConnection().also { connections += it }
    }
}
