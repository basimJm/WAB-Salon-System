package com.fab.wab.merchant.core.realtime.di

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.network.client.BaseHttpClient
import com.fab.wab.merchant.core.network.client.PlatformEngineProvider
import com.fab.wab.merchant.core.realtime.FakeRealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeConfig
import com.fab.wab.merchant.core.realtime.socketio.KtorWebSocketTransport
import com.fab.wab.merchant.core.realtime.socketio.RealtimeTransport
import com.fab.wab.merchant.core.realtime.socketio.SocketIoRealtimeClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import org.koin.dsl.module

/**
 * One realtime client per app: Socket.IO against the API host with the session's access token (rotated through the
 * HTTP layer's refresh coordinator when the handshake says it expired), or the fake when the environment serves
 * fixtures (`DATA_SOURCE=mock`, no socket server to talk to).
 */
val realtimeModule = module {
    single { RealtimeConfig(apiBaseUrl = get<AppEnvironment>().apiBaseUrl) }
    single<RealtimeTransport> { KtorWebSocketTransport(PlatformEngineProvider) }
    single<RealtimeClient> {
        val environment = get<AppEnvironment>()
        if (environment.usesMock) {
            FakeRealtimeClient()
        } else {
            val sessionStore = get<SessionStore>()
            val refresher = get<BaseHttpClient>().refresher
            SocketIoRealtimeClient(
                config = get(),
                transport = get(),
                accessToken = { sessionStore.tokens()?.accessToken },
                refreshAfterUnauthorized = refresher::refreshAfterUnauthorized,
                scope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
            )
        }
    }
}
