package com.fab.wab.customer.feature.auth.data

import com.fab.wab.customer.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.customer.core.data.contract.generated.PostAuthOtpWrongAttemptData
import com.fab.wab.customer.core.data.contract.generated.PostAuthRegisterData
import com.fab.wab.customer.core.data.contract.generated.PutInstallationsData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.feature.auth.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** CUS-060: OTP pre-check, wrong attempt, login, register and installation captured from the local real stack. */
class RealAuthFixturesTest {

    @Test
    fun realOtpPolicyAndWrongAttemptMap() {
        val policy = decodeFixture("PostAuthOtpRequest", PostAuthOtpRequestData.serializer()).data.toDomain()
        assertEquals(OTP_LENGTH, policy.otpLength)
        assertTrue(policy.allowed)
        val wrong = decodeFixture("PostAuthOtpWrongAttempt", PostAuthOtpWrongAttemptData.serializer()).data.toDomain()
        assertTrue(wrong.attemptsRemaining >= 0)
    }

    @Test
    fun realLoginAndRegisterSignTheCustomerIn() {
        val login = decodeFixture("PostAuthLogin", PostAuthLoginData.serializer()).data.toDomain()
        assertNotNull(login.user.gender)
        assertTrue(login.tokens.accessToken.isNotBlank() && login.tokens.refreshToken.isNotBlank())
        val register = decodeFixture("PostAuthRegister", PostAuthRegisterData.serializer()).data.toDomain()
        assertTrue(register.user.firstName.isNotBlank())
        assertTrue(decodeFixture("PutInstallations", PutInstallationsData.serializer()).data.installationId.isNotBlank())
    }

    private companion object {
        const val OTP_LENGTH = 6
    }
}
