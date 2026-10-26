package com.fab.wab.merchant.feature.auth.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.FieldError
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.OtpDialog
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.SideEffect
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiAction
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.time.Duration.Companion.seconds

private const val WRONG_CODE = "000000"
private const val ATTEMPTS_LEFT_LINE = "The verification code is incorrect. Attempts left: 4."
private const val BLOCK_SECONDS = 900

/** MER-070: `OTP_INVALID` / `OTP_EXPIRED` / `OTP_BLOCKED` on verify, the code lifetime, and a failed sign-in after verify. */
@OptIn(ExperimentalCoroutinesApi::class)
class OtpVerifyErrorsTest {

    @Test
    fun wrongCodeShowsTheServersAttemptsLeftLineAndKeepsTheCodeLive() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        val detail = FieldError(field = "body.code", code = ErrorCode.OTP_INVALID.name, message = ATTEMPTS_LEFT_LINE)
        harness.repository.verifyResult = serverError(ErrorCode.OTP_INVALID, details = listOf(detail))
        val viewModel = harness.viewModel()
        viewModel.enterAndVerify(this, WRONG_CODE)
        val wrong = viewModel.state.first()
        assertTrue(wrong.codeError)
        assertEquals(ATTEMPTS_LEFT_LINE, wrong.codeErrorMessage)
        assertTrue(wrong.codeSent)
        assertFalse(wrong.verifying)
        assertTrue(harness.effects.isEmpty())
        assertTrue(harness.repository.loggedInWith.isEmpty())

        viewModel.onEvent(UiAction.OnCodeChange(RIGHT_CODE))
        assertFalse(viewModel.state.first().codeError)
        assertNull(viewModel.state.first().codeErrorMessage)
        harness.repository.verifyResult = serverError(ErrorCode.OTP_INVALID)
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        assertTrue(viewModel.state.first().codeError)
        assertNull(viewModel.state.first().codeErrorMessage, "no detail: the screen shows its own wrong-code text")
        assertEquals(2, harness.repository.verified.size, "each wrong code is sent once (no refresh + retry)")
    }

    @Test
    fun blockedOnVerifyEndsTheCodeAndShowsTheBlockedBannerWithTheRemainingTime() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        harness.repository.verifyResult = serverError(ErrorCode.OTP_BLOCKED, HTTP_TOO_MANY)
        val viewModel = harness.viewModel()
        viewModel.state.first { !it.requesting }
        // The fifth wrong code starts the block: the follow-up request answers `allowed: false` + `blockedUntil`.
        harness.repository.policy = OtpPolicy(
            allowed = false,
            otpLength = TEST_OTP_LENGTH,
            resendAfterSeconds = 0,
            blockedUntil = OTP_NOW + BLOCK_SECONDS.seconds,
        )
        viewModel.enterAndVerify(this, WRONG_CODE)
        val state = viewModel.state.first()
        assertTrue(harness.effects.isEmpty(), "the banner replaces the toast")
        assertEquals(2, harness.repository.requested.size, "one status request after the block")
        assertTrue(state.isBlocked)
        assertEquals(BLOCK_SECONDS, state.blockedRemainingSeconds)
        assertFalse(state.codeSent)
        assertEquals("", state.code)
        assertFalse(state.canVerify)
        assertFalse(state.canResend)
    }

    @Test
    fun blockedOnVerifyWithoutAStatusShowsTheBlockMessage() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        harness.repository.verifyResult = serverError(ErrorCode.OTP_BLOCKED, HTTP_TOO_MANY)
        val viewModel = harness.viewModel()
        viewModel.state.first { !it.requesting }
        harness.repository.requestError = AppError.NetworkError(ERROR_TEXT)
        viewModel.enterAndVerify(this, WRONG_CODE)
        val state = viewModel.state.first()
        assertEquals(listOf<SideEffect>(SideEffect.ShowError(ERROR_TEXT)), harness.effects)
        assertFalse(state.codeSent)
        assertEquals("", state.code)
        assertFalse(state.canVerify)
    }

    @Test
    fun expiredOnVerifyShowsThePopupAndResendSendsANewCode() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        harness.repository.verifyResult = serverError(ErrorCode.OTP_EXPIRED)
        val viewModel = harness.viewModel()
        viewModel.enterAndVerify(this)
        assertEquals(OtpDialog.Expired, viewModel.state.first().dialog)
        assertFalse(viewModel.state.first().canVerify)
        testScheduler.advanceTimeBy((TEST_RESEND_SECONDS + 1).seconds)
        testScheduler.runCurrent()
        viewModel.onEvent(UiAction.OnDialogDismiss)
        viewModel.onEvent(UiAction.OnResendClick)
        testScheduler.runCurrent()
        val fresh = viewModel.state.first { !it.requesting }
        assertNull(fresh.dialog)
        assertTrue(fresh.codeSent)
        assertEquals("", fresh.code)
        assertEquals(2, harness.repository.requested.size)
    }

    @Test
    fun theCodeLifetimeRunningOutShowsThePopup() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        val viewModel = harness.viewModel()
        viewModel.state.first { !it.requesting }
        testScheduler.advanceTimeBy((TEST_EXPIRES_SECONDS + 1).seconds)
        testScheduler.runCurrent()
        val expired = viewModel.state.first()
        assertEquals(OtpDialog.Expired, expired.dialog)
        assertFalse(expired.codeSent)
        assertEquals(0, expired.expiresRemainingSeconds)
    }

    @Test
    fun aRejectedTokenAtSignInAsksForANewCode() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        harness.repository.loginResult = serverError(ErrorCode.OTP_EXPIRED)
        val viewModel = harness.viewModel()
        viewModel.enterAndVerify(this)
        val state = viewModel.state.first()
        assertEquals(OtpDialog.Expired, state.dialog)
        assertFalse(state.codeSent)
        assertEquals(listOf(TEST_OTP_TOKEN), harness.repository.loggedInWith)
        assertNull(harness.session.signedInMember)
    }

    @Test
    fun anyOtherFailedSignInShowsTheErrorAndNeedsANewCode() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        harness.repository.loginResult = serverError(ErrorCode.MEMBER_INACTIVE, HTTP_FORBIDDEN)
        val viewModel = harness.viewModel()
        viewModel.enterAndVerify(this)
        val state = viewModel.state.first()
        assertEquals(listOf<SideEffect>(SideEffect.ShowError(ERROR_TEXT)), harness.effects)
        assertFalse(state.codeSent, "the otpToken is single use: verifying the same code again is pointless")
        assertFalse(state.canVerify)
        assertEquals("", state.code)
    }

    private companion object {
        const val HTTP_FORBIDDEN = 403
    }
}
