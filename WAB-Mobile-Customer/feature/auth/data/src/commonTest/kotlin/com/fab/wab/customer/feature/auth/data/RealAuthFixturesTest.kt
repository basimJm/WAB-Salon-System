package com.fab.wab.customer.feature.auth.data

import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpVerifyData
import com.fab.wab.customer.core.data.contract.generated.PostAuthRegisterData
import com.fab.wab.customer.core.data.contract.generated.PutInstallationsData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.feature.auth.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * CUS-060: login, register and installation captured from the local real stack. The OTP request / verify fixtures are
 * generated from the 1.4.0 contract until the next capture (CUS-089: the old captures predate the WhatsApp OTP).
 */
class RealAuthFixturesTest {

    @Test
    fun realLoginAndRegisterSignTheCustomerIn() {
        val login = decodeFixture("PostAuthLogin", PostAuthLoginData.serializer()).data.toDomain()
        assertNotNull(login.user.gender)
        assertTrue(login.tokens.accessToken.isNotBlank() && login.tokens.refreshToken.isNotBlank())
        val register = decodeFixture("PostAuthRegister", PostAuthRegisterData.serializer()).data.toDomain()
        assertTrue(register.user.firstName.isNotBlank())
        assertTrue(decodeFixture("PutInstallations", PutInstallationsData.serializer()).data.installationId.isNotBlank())
    }

    @Test
    fun mockOtpFixturesSendAndVerifySoDevMockStillSignsIn() {
        val policy = decodeFixture("PostAuthOtpRequest", PostAuthOtpRequestData.serializer()).data.toDomain()
        assertTrue(policy.allowed)
        assertEquals(OTP_LENGTH, policy.otpLength)
        assertTrue(policy.expiresInSeconds > 0)
        val proof = decodeFixture("PostAuthOtpVerify", PostAuthOtpVerifyData.serializer()).data.toDomain()
        assertTrue(proof.otpToken.isNotBlank())
    }

    private companion object {
        const val OTP_LENGTH = 6
    }
}
