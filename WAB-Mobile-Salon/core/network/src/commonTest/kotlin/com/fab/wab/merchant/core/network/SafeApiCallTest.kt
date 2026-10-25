package com.fab.wab.merchant.core.network

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.permission.PermissionDeniedSignals
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.io.IOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

@Serializable
private data class Pong(val ok: Boolean)

private const val ENVELOPE = """{"success":false,"message":"الرقم غير مسجل","error":{"code":"PHONE_NOT_REGISTERED","traceId":"t-1"}}"""
private const val VALIDATION =
    """{"success":false,"message":"bad","error":{"code":"VALIDATION_ERROR","details":[{"field":"email","code":"INVALID","message":"x"}]}}"""

class SafeApiCallTest {

    private fun client(status: HttpStatusCode, body: String, json: Boolean = true) = HttpClient(
        MockEngine { _ ->
            respond(body, status, headersOf(HttpHeaders.ContentType, if (json) "application/json" else "text/html"))
        },
    ) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
        expectSuccess = true
    }

    @Test
    fun successBodyIsReturned() = runTest {
        val result = safeApiCall { client(HttpStatusCode.OK, """{"ok":true}""").get("/x").body<Pong>() }
        assertEquals(AppResult.Success(Pong(true)), result)
    }

    @Test
    fun envelopeBecomesServerErrorWithCode() = runTest {
        val result = safeApiCall { client(HttpStatusCode.NotFound, ENVELOPE).get("/x").body<Pong>() }
        val error = assertIs<AppResult.Error>(result).appError
        val server = assertIs<AppError.ServerError>(error)
        assertEquals(ErrorCode.PHONE_NOT_REGISTERED, server.code)
        assertEquals(HttpStatusCode.NotFound.value, server.statusCode)
        assertEquals("الرقم غير مسجل", server.message)
        assertEquals("t-1", server.traceId)
    }

    @Test
    fun validationDetailsAreKept() = runTest {
        val result = safeApiCall { client(HttpStatusCode.BadRequest, VALIDATION).get("/x").body<Pong>() }
        val server = assertIs<AppError.ServerError>(assertIs<AppResult.Error>(result).appError)
        assertEquals(ErrorCode.VALIDATION_ERROR, server.code)
        assertEquals("email", server.details.single().field)
    }

    @Test
    fun unknownCodeMapsToUnknownButStaysAServerError() = runTest {
        val body = """{"success":false,"message":"m","error":{"code":"SOMETHING_NEW"}}"""
        val result = safeApiCall { client(HttpStatusCode.Conflict, body).get("/x").body<Pong>() }
        val server = assertIs<AppError.ServerError>(assertIs<AppResult.Error>(result).appError)
        assertEquals(ErrorCode.UNKNOWN, server.code)
    }

    @Test
    fun nonEnvelopeFailureIsAPlainHttpError() = runTest {
        val result = safeApiCall { client(HttpStatusCode.BadGateway, "<html>502</html>", json = false).get("/x").body<Pong>() }
        val http = assertIs<AppError.HttpError>(assertIs<AppResult.Error>(result).appError)
        assertEquals(HttpStatusCode.BadGateway.value, http.statusCode)
    }

    @Test
    fun transportFailureIsANetworkError() = runTest {
        val result = safeApiCall<Pong> { throw IOException("unreachable") }
        assertEquals(AppResult.Error(AppError.NetworkError("unreachable")), result)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun permissionRefusalIsReportedSoThePermissionsRefresh() = runTest(UnconfinedTestDispatcher()) {
        val signal = async { PermissionDeniedSignals.events.first() }
        val body = """{"success":false,"message":"m","error":{"code":"PERMISSION_DENIED"}}"""
        val result = safeApiCall { client(HttpStatusCode.Forbidden, body).get("/x").body<Pong>() }
        assertEquals(ErrorCode.PERMISSION_DENIED, assertIs<AppError.ServerError>(assertIs<AppResult.Error>(result).appError).code)
        assertEquals(Unit, signal.await())
    }
}
