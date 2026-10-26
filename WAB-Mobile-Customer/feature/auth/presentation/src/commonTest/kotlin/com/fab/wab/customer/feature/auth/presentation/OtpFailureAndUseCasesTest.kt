package com.fab.wab.customer.feature.auth.presentation

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.FieldError
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.OTP_CODE_DETAIL_FIELD
import com.fab.wab.customer.feature.auth.domain.model.OtpFailure
import com.fab.wab.customer.feature.auth.domain.model.OtpProof
import com.fab.wab.customer.feature.auth.domain.model.otpFailureOf
import com.fab.wab.customer.feature.auth.domain.usecase.LoginWithOtpTokenUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.VerifyOtpUseCase
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** CUS-089: OTP error mapping (code-driven, never message-driven) and the verify / login-with-token use cases. */
class OtpFailureAndUseCasesTest {

    @Test
    fun otpCodesMapToTheScreenReactions() {
        assertEquals(OtpFailure.Expired, otpFailureOf(serverError(ErrorCode.OTP_EXPIRED, UNAUTHORIZED_STATUS)))
        assertEquals(OtpFailure.Blocked, otpFailureOf(serverError(ErrorCode.OTP_BLOCKED, TOO_MANY)))
        assertEquals(OtpFailure.DeliveryFailed, otpFailureOf(serverError(ErrorCode.OTP_DELIVERY_FAILED, UNPROCESSABLE)))
        assertEquals(OtpFailure.InvalidCode(null), otpFailureOf(serverError(ErrorCode.OTP_INVALID, UNAUTHORIZED_STATUS)))
        val network = AppError.NetworkError("offline")
        assertEquals(OtpFailure.Other(network), otpFailureOf(network))
        val other = serverError(ErrorCode.VALIDATION_ERROR, BAD_REQUEST)
        assertEquals(OtpFailure.Other(other), otpFailureOf(other))
    }

    @Test
    fun wrongCodePrefersTheBodyCodeDetailAndIgnoresBlankOrForeignDetails() {
        assertEquals(OtpFailure.InvalidCode(ATTEMPTS), otpFailureOf(invalidCode(ATTEMPTS)))
        val mixed = serverError(
            ErrorCode.OTP_INVALID,
            UNAUTHORIZED_STATUS,
            listOf(
                FieldError("body.phone", ErrorCode.VALIDATION_ERROR.name, "bad phone"),
                FieldError("other", ErrorCode.OTP_INVALID.name, "fallback"),
                FieldError(OTP_CODE_DETAIL_FIELD, ErrorCode.OTP_INVALID.name, ATTEMPTS),
            ),
        )
        assertEquals(OtpFailure.InvalidCode(ATTEMPTS), otpFailureOf(mixed))
        val blank = serverError(
            ErrorCode.OTP_INVALID,
            UNAUTHORIZED_STATUS,
            listOf(FieldError(OTP_CODE_DETAIL_FIELD, ErrorCode.OTP_INVALID.name, " ")),
        )
        assertNull((otpFailureOf(blank) as OtpFailure.InvalidCode).serverMessage)
    }

    @Test
    fun verifyPassesPhonePurposeAndCodeAndLoginStoresTheSession() = runTest {
        val repository = OtpFakeAuthRepository()
        assertEquals(
            AppResult.Success(OtpProof(OTP_TOKEN, OTP_EXPIRES_SECONDS)),
            VerifyOtpUseCase(repository)(OTP_E164, AuthPurpose.REGISTER, "654321"),
        )
        assertEquals(listOf(VerifyCall(OTP_E164, AuthPurpose.REGISTER, "654321")), repository.verified)
        val session = OtpFakeSessionStore()
        LoginWithOtpTokenUseCase(repository, { null }, session)(OTP_PHONE, OTP_TOKEN)
        assertEquals(listOf(OTP_TOKEN), repository.loginTokens)
        assertEquals("Omar", session.signedIn?.firstName)
        repository.loginResult = AppResult.Error(serverError(ErrorCode.OTP_INVALID, UNAUTHORIZED_STATUS))
        val refused = OtpFakeSessionStore()
        LoginWithOtpTokenUseCase(repository, { null }, refused)(OTP_PHONE, OTP_TOKEN)
        assertNull(refused.signedIn)
    }

    private companion object {
        const val ATTEMPTS = "Wrong code. 2 attempts left."
        const val TOO_MANY = 429
        const val UNPROCESSABLE = 422
        const val BAD_REQUEST = 400
    }
}
