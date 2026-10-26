package com.fab.wab.merchant.feature.auth.data

import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpVerifyData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import com.fab.wab.merchant.feature.auth.data.repository.toDomain
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the auth mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealAuthFixturesTest {

    @Test
    fun loginOtpRequestAndVerifyMap() {
        val login = decodeFixture("PostAuthLogin", serializer<PostAuthLoginData>()).data
        assertNotNull(login.toDomain())
        assertEquals("OWNER", login.member.role)
        assertEquals(null, login.member.branchId)
        val policy = decodeFixture("PostAuthOtpRequest", serializer<PostAuthOtpRequestData>()).data.toDomain()
        assertTrue(policy.allowed && policy.otpLength > 0 && policy.expiresInSeconds > 0)
        val proof = decodeFixture("PostAuthOtpVerify", serializer<PostAuthOtpVerifyData>()).data.toDomain()
        assertTrue(proof.otpToken.isNotBlank() && proof.expiresInSeconds > 0)
    }
}
