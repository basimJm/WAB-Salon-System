package com.fab.wab.customer.feature.auth.data

import com.fab.wab.customer.core.data.contract.generated.CustomerProfile
import com.fab.wab.customer.core.data.contract.generated.CustomerProfilePhone
import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.auth.data.repository.toBody
import com.fab.wab.customer.feature.auth.data.repository.toDomain
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.model.toE164
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.time.Instant

class AuthMappersTest {

    @Test
    fun otpPolicyParsesTheBlockTimestampLeniently() {
        val blocked = PostAuthOtpRequestData(allowed = false, otpLength = 6, resendAfterSeconds = 60, blockedUntil = "2026-10-18T10:00:00Z")
        assertEquals(Instant.parse("2026-10-18T10:00:00Z"), blocked.toDomain().blockedUntil)
        assertNull(PostAuthOtpRequestData(true, 6, 60, blockedUntil = "not-a-date").toDomain().blockedUntil)
        assertEquals(6, blocked.toDomain().otpLength)
    }

    @Test
    fun loginDataBecomesASessionWithTheFactsTheAppKeeps() {
        val data = PostAuthLoginData(
            accessToken = "a", accessTokenExpiresAt = "x", refreshToken = "r", refreshTokenExpiresAt = "y",
            customer = CustomerProfile(
                id = "c1", firstName = "Omar", lastName = "H", email = "o@example.invalid", gender = "MALE",
                phone = CustomerProfilePhone("JO", "+962", "791234567", "+962791234567"),
                cityId = "amman", areaId = "a1", language = "ar", pushEnabled = true,
            ),
        )
        val session = data.toDomain()
        assertEquals("a", session.tokens.accessToken)
        assertEquals("r", session.tokens.refreshToken)
        assertEquals("c1", session.user.id)
        assertEquals("Omar", session.user.firstName)
        assertEquals(Gender.MALE, session.user.gender)
        assertEquals("+962791234567", PhoneNumber("JO", "791234567").toE164("+962"))
    }

    @Test
    fun registerRequestBecomesTheContractBody() {
        val phone = PhoneNumber("JO", "791234567")
        val request = RegisterRequest("Sara", "H", "s@example.invalid", Gender.FEMALE, "amman", "a1", phone, "proof")
        val body = request.toBody(InstallationInfo("inst", "ANDROID", "1.0", fcmToken = "fcm"))
        assertEquals("FEMALE", body.gender)
        assertEquals("JO", body.phone.countryCode)
        assertEquals("791234567", body.phone.number)
        assertEquals("proof", body.idToken)
        assertEquals("inst", body.installation.installationId)
        assertEquals("fcm", body.installation.fcmToken)
    }
}
