package com.fab.wab.customer.core.network.client

import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.network.config.ApiConfig
import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.DefaultRequest
import io.ktor.client.plugins.HttpResponseValidator
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.ResponseException
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.URLProtocol
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json

expect fun provideHttpClientEngine(): HttpClientEngine

class BaseHttpClient(
    private val config: ApiConfig,
    private val appSettings: AppSettings,
    private val sessionTimeOut: SessionTimeOut
) {
    private val mutex = Mutex()

    private suspend fun sendSessionTimeOutOnUnauthorized(hasAuthorizationHeader: Boolean) {
        (hasAuthorizationHeader || !appSettings.token.first().isNullOrBlank())
            .takeIf { it }
            ?.let {
                mutex.withLock {
                    sessionTimeOut.sendSessionTimeOut(true)
                }
            }
    }

    fun buildHttpClient() = HttpClient(provideHttpClientEngine()) {
        install(CurlLogger) {
            isDebug = config.isDebug
        }
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                explicitNulls = false
            }, contentType = ContentType.Application.Json)
        }

        install(HttpTimeout) {
            requestTimeoutMillis = config.sendTimeout
            socketTimeoutMillis = config.receiveTimeout
            connectTimeoutMillis = config.connectTimeout
        }

        install(DefaultRequest.Plugin) {
            headers.append(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            headers.append(HttpHeaders.Accept, ContentType.Application.Json.toString())
            url {
                val base = config.baseUrl.trim()
                require(base.isNotBlank()) {
                    "API base URL is blank. Set API_BASE_URL in local.properties (e.g. http://10.0.2.2:8080 for emulator)."
                }
                val withoutScheme = base.removePrefix("https://").removePrefix("http://").trim()
                val hostPart = withoutScheme.split("/").firstOrNull()?.trim() ?: ""
                require(hostPart.isNotBlank()) {
                    "API base URL has no host: $base. Use e.g. http://10.0.2.2:8080 (emulator) or http://<host-ip>:8080."
                }
                val hostAndPort = hostPart.split(":")
                host = when (hostAndPort.size) {
                    1 -> hostAndPort[0]
                    else -> hostAndPort.dropLast(1).joinToString(":")
                }
                val portPart = hostAndPort.lastOrNull()?.toIntOrNull()
                if (portPart != null && portPart in 1..65535) {
                    port = portPart
                }
                protocol = when {
                    base.startsWith("https://") -> URLProtocol.HTTPS
                    else -> URLProtocol.HTTP
                }
            }
        }

        install(AuthTokenPlugin) {
            tokenProvider = {
                kotlinx.coroutines.runBlocking {
                    appSettings.token.first()
                }
            }
        }


        install(AcceptLanguagePlugin) {
            languageProvider = {
                kotlinx.coroutines.runBlocking {
                    appSettings.language.first()
                }
            }
        }

        expectSuccess = true

        HttpResponseValidator {
            validateResponse { response ->
                response.status.value
                    .takeIf { it == 401 }
                    ?.let {
                        sendSessionTimeOutOnUnauthorized(
                            response.call.request.headers[HttpHeaders.Authorization]
                                .isNullOrBlank()
                                .not()
                        )
                    }
            }

            handleResponseExceptionWithRequest { cause, request ->
                (cause as? ResponseException)
                    ?.response
                    ?.status
                    ?.value
                    ?.takeIf { it == 401 }
                    ?.let {
                        sendSessionTimeOutOnUnauthorized(
                            request.headers[HttpHeaders.Authorization]
                                .isNullOrBlank()
                                .not()
                        )
                    }
            }
        }
    }
}
