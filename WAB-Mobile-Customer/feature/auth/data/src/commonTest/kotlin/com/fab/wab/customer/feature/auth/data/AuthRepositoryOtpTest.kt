package com.fab.wab.customer.feature.auth.data

import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.auth.data.remote.AuthApi
import com.fab.wab.customer.feature.auth.data.repository.AuthRepositoryImpl
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.OtpFailure
import com.fab.wab.customer.feature.auth.domain.model.OtpProof
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.otpFailureOf
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import io.ktor.http.contentType
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs

/** CUS-089: the WhatsApp OTP wire format (`otp/verify`, `otpToken` in login / change phone) and its error envelopes. */
class AuthRepositoryOtpTest {

    private val calls = mutableListOf<Pair<String, JsonObject>>()
    private var status = HttpStatusCode.OK
    private var answer = """{"success":true,"message":"","data":{"otpToken":"tok-1","expiresInSeconds":600}}"""

    private val client = HttpClient(
        MockEngine { request ->
            val body = (request.body as? TextContent)?.text.orEmpty()
            calls += request.url.encodedPath to Json.parseToJsonElement(body).jsonObject
            respond(answer, status, headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()))
        },
    ) {
        expectSuccess = true
        install(ContentNegotiation) { json() }
        defaultRequest { contentType(ContentType.Application.Json) }
    }
    private val repository = AuthRepositoryImpl(AuthApi(client))

    private fun sent(index: Int, field: String): String? = calls[index].second[field]?.jsonPrimitive?.content

    @Test
    fun verifySendsPhonePurposeAndCodeAndReturnsTheToken() = runTest {
        val result = repository.verifyOtp(E164, AuthPurpose.CHANGE_PHONE, CODE)
        assertEquals(AppResult.Success(OtpProof("tok-1", PROOF_TTL)), result)
        assertEquals(CustomerOperations.postAuthOtpVerify.path, calls.single().first)
        assertEquals(E164, sent(0, "phone"))
        assertEquals("CHANGE_PHONE", sent(0, "purpose"))
        assertEquals(CODE, sent(0, "code"))
    }

    @Test
    fun loginAndChangePhoneSendTheOtpTokenNotAFirebaseToken() = runTest {
        // The answer does not matter here, only what was sent: a refused token keeps the test free of response DTOs.
        status = HttpStatusCode.Unauthorized
        answer = """{"success":false,"message":"","error":{"code":"OTP_INVALID","traceId":"t0"}}"""
        repository.login(PhoneNumber("JO", NUMBER), "tok-2", installation = null)
        repository.changePhone(PhoneNumber("JO", NUMBER), "tok-3")
        assertEquals("tok-2", sent(0, OTP_TOKEN_FIELD))
        assertEquals("tok-3", sent(1, OTP_TOKEN_FIELD))
        assertFalse(calls.any { it.second.containsKey(LEGACY_FIREBASE_FIELD) })
    }

    @Test
    fun wrongCodeEnvelopeKeepsTheAttemptsLeftText() = runTest {
        status = HttpStatusCode.Unauthorized
        answer = """{"success":false,"message":"Invalid code","error":{"code":"OTP_INVALID","traceId":"t1",""" +
            """"details":[{"field":"body.code","code":"OTP_INVALID","message":"$ATTEMPTS_TEXT"}]}}"""
        val result = repository.verifyOtp(E164, AuthPurpose.LOGIN, CODE)
        assertIs<AppResult.Error>(result)
        assertEquals(OtpFailure.InvalidCode(ATTEMPTS_TEXT), otpFailureOf(result.appError))
    }

    @Test
    fun numberWithoutWhatsAppIsADeliveryFailure() = runTest {
        status = HttpStatusCode.UnprocessableEntity
        answer = """{"success":false,"message":"No WhatsApp","error":{"code":"OTP_DELIVERY_FAILED","traceId":"t2"}}"""
        val result = repository.requestOtp(E164, AuthPurpose.REGISTER)
        assertIs<AppResult.Error>(result)
        assertEquals(OtpFailure.DeliveryFailed, otpFailureOf(result.appError))
        assertEquals("REGISTER", sent(0, "purpose"))
    }

    private companion object {
        const val NUMBER = "791234567"
        const val E164 = "+962791234567"
        const val CODE = "123456"
        const val PROOF_TTL = 600
        const val ATTEMPTS_TEXT = "Wrong code. 3 attempts left."
        const val OTP_TOKEN_FIELD = "otpToken"
        const val LEGACY_FIREBASE_FIELD = "idToken"
    }
}
