package com.fab.wab.merchant.core.realtime.socketio

import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeConfig
import com.fab.wab.merchant.core.realtime.RealtimeDefaults
import com.fab.wab.merchant.core.realtime.RealtimeEvent
import com.fab.wab.merchant.core.realtime.RealtimeStatus
import com.fab.wab.merchant.core.realtime.reconnectDelayMs
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.io.IOException

private const val CODE_UNAUTHORIZED = "UNAUTHORIZED"

/**
 * Socket.IO v4 over one WebSocket: Engine.IO open → namespace connect with the access token → events.
 * Answers pings, treats a silent server as dropped, reconnects with backoff while [connect] is wanted and stops on
 * `UNAUTHORIZED` (the app reconnects after the next refresh / foreground).
 */
class SocketIoRealtimeClient(
    private val config: RealtimeConfig,
    private val transport: RealtimeTransport,
    private val accessToken: suspend () -> String?,
    private val scope: CoroutineScope,
    private val protocol: SocketIoProtocol = SocketIoProtocol(),
    private val handshakeTimeoutMs: Long = RealtimeDefaults.HANDSHAKE_TIMEOUT_MS,
) : RealtimeClient {

    private val statusState = MutableStateFlow(RealtimeStatus.Disconnected)
    private val eventFlow = MutableSharedFlow<RealtimeEvent>(extraBufferCapacity = RealtimeDefaults.EVENT_BUFFER)
    private var job: Job? = null

    override val status: StateFlow<RealtimeStatus> = statusState.asStateFlow()
    override val events: SharedFlow<RealtimeEvent> = eventFlow.asSharedFlow()

    override fun connect() {
        if (job?.isActive == true) return
        job = scope.launch { runUntilStopped() }
    }

    override fun disconnect() {
        job?.cancel()
        job = null
        statusState.value = RealtimeStatus.Disconnected
    }

    private suspend fun runUntilStopped() {
        var attempt = 0
        while (true) {
            statusState.value = if (attempt == 0) RealtimeStatus.Connecting else RealtimeStatus.Reconnecting
            val token = accessToken()
            if (token.isNullOrBlank()) {
                statusState.value = RealtimeStatus.Unauthorized
                return
            }
            when (runSession(token)) {
                SessionEnd.Unauthorized -> {
                    statusState.value = RealtimeStatus.Unauthorized
                    return
                }
                SessionEnd.Dropped -> {
                    statusState.value = RealtimeStatus.Reconnecting
                    delay(reconnectDelayMs(attempt))
                    attempt += 1
                }
            }
        }
    }

    private suspend fun runSession(token: String): SessionEnd {
        val connection = try {
            transport.open(config.webSocketUrl)
        } catch (ignored: IOException) {
            return SessionEnd.Dropped
        } catch (ignored: IllegalStateException) {
            return SessionEnd.Dropped
        }
        val session = Session(connection, token)
        return try {
            session.run()
        } catch (cancelled: CancellationException) {
            connection.close()
            throw cancelled
        } catch (ignored: IOException) {
            SessionEnd.Dropped
        } finally {
            connection.close()
        }
    }

    private enum class SessionEnd { Dropped, Unauthorized }

    /** One connection from the Engine.IO open frame to its end; frames arrive within the server's ping budget. */
    private inner class Session(private val connection: RealtimeConnection, private val token: String) {
        private var frameTimeoutMs = handshakeTimeoutMs
        private var end: SessionEnd? = null

        /** Null from [RealtimeConnection.receive] (closed) or no frame within the ping budget both end the session. */
        suspend fun run(): SessionEnd {
            while (end == null) {
                val frame = withTimeoutOrNull(frameTimeoutMs) { connection.receive() } ?: return SessionEnd.Dropped
                handle(protocol.decode(frame))
            }
            return checkNotNull(end)
        }

        private suspend fun handle(packet: EngineIoPacket) {
            when (packet) {
                is EngineIoPacket.Open -> {
                    val interval = packet.pingIntervalMs ?: RealtimeDefaults.PING_INTERVAL_MS
                    val timeout = packet.pingTimeoutMs ?: RealtimeDefaults.PING_TIMEOUT_MS
                    frameTimeoutMs = interval + timeout
                    connection.send(protocol.encodeConnect(config.namespace, token))
                }
                EngineIoPacket.Ping -> connection.send(protocol.encodePong())
                EngineIoPacket.Close -> end = SessionEnd.Dropped
                is EngineIoPacket.Message -> handle(packet.packet)
                EngineIoPacket.Pong, is EngineIoPacket.Unknown -> Unit
            }
        }

        private fun handle(packet: SocketIoPacket) {
            if (packet.namespace != config.namespace) return
            when (packet) {
                is SocketIoPacket.Connected -> statusState.value = RealtimeStatus.Connected
                is SocketIoPacket.Event -> eventFlow.tryEmit(RealtimeEvent(packet.name, packet.payload))
                is SocketIoPacket.ConnectError ->
                    end = if (packet.code == CODE_UNAUTHORIZED) SessionEnd.Unauthorized else SessionEnd.Dropped
                is SocketIoPacket.Disconnect -> end = SessionEnd.Dropped
                is SocketIoPacket.Connect, is SocketIoPacket.Unknown -> Unit
            }
        }
    }

}
