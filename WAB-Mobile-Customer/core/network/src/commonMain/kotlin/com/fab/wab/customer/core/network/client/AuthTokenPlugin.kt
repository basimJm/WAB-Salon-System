package com.fab.wab.customer.core.network.client

import io.ktor.client.plugins.api.createClientPlugin
import io.ktor.http.HttpHeaders
import kotlinx.coroutines.runBlocking

class AuthTokenPluginConfig {
    var tokenProvider: (suspend () -> String?)? = null
}

val AuthTokenPlugin = createClientPlugin("AuthTokenPlugin", ::AuthTokenPluginConfig) {
    val tokenProvider = pluginConfig.tokenProvider
    onRequest { request, _ ->
        tokenProvider?.let { provider ->
            val token = provider()
            if (!token.isNullOrBlank()) {
                request.headers.append(HttpHeaders.Authorization, "Bearer $token")
            }
        }
    }
}
