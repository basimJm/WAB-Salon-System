package com.fab.wab.merchant.feature.auth.presentation

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.OtpProof
import com.fab.wab.merchant.feature.auth.domain.usecase.LoginWithOtpTokenUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.VerifyOtpUseCase
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

/** MER-070 use cases: verify forwards phone, purpose and code; only a successful sign-in stores the session. */
class OtpUseCasesTest {

    @Test
    fun verifyForwardsPurposeAndCodeAndReturnsTheToken() = runTest {
        val repository = FakeAuthRepository()
        val result = VerifyOtpUseCase(repository)(OTP_E164, AuthPurpose.CHANGE_PHONE, RIGHT_CODE)
        assertEquals(AppResult.Success(OtpProof(TEST_OTP_TOKEN, TEST_PROOF_SECONDS)), result)
        assertEquals(listOf(AuthPurpose.CHANGE_PHONE to RIGHT_CODE), repository.verified)
    }

    @Test
    fun loginWithTheOtpTokenStoresTheSessionOnlyOnSuccess() = runTest {
        val repository = FakeAuthRepository()
        val session = FakeSessionStore()
        val login = LoginWithOtpTokenUseCase(repository, { null }, session)

        repository.loginResult = serverError(ErrorCode.OTP_INVALID)
        assertIs<AppResult.Error>(login(OTP_PHONE, TEST_OTP_TOKEN))
        assertNull(session.signedInMember)

        repository.loginResult = FakeAuthRepository().loginResult
        assertIs<AppResult.Success<*>>(login(OTP_PHONE, TEST_OTP_TOKEN))
        assertEquals(OWNER, session.signedInMember)
        assertEquals(listOf(TEST_OTP_TOKEN, TEST_OTP_TOKEN), repository.loggedInWith)
    }
}
