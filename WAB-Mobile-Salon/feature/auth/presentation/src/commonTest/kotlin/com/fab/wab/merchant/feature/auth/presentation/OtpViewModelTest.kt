package com.fab.wab.merchant.feature.auth.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.SideEffect
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.formatCountdown
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

private const val BLOCK_SECONDS = 90
private const val AWAY_SECONDS = 30

/** MER-070 happy paths: WhatsApp code request → verify → `otpToken` → sign-in or hand-off (BUSINESS_DOMAIN §3.1a). */
@OptIn(ExperimentalCoroutinesApi::class)
class OtpViewModelTest {

    @Test
    fun requestsTheCodeForTheE164NumberAndCountsDownResendAndExpiry() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        val viewModel = harness.viewModel()
        val ready = viewModel.state.first { !it.requesting }
        assertEquals(OTP_DISPLAY, ready.phoneDisplay)
        assertEquals(listOf(OTP_E164), harness.repository.requested)
        assertTrue(ready.codeSent)
        assertEquals(TEST_OTP_LENGTH, ready.otpLength)
        assertEquals(TEST_RESEND_SECONDS, ready.resendRemainingSeconds)
        assertEquals(TEST_EXPIRES_SECONDS, ready.expiresRemainingSeconds)
        assertFalse(ready.canResend)
        testScheduler.advanceTimeBy((TEST_RESEND_SECONDS + 1).seconds)
        testScheduler.runCurrent()
        val resendable = viewModel.state.first { it.resendRemainingSeconds == 0 }
        assertTrue(resendable.canResend)
        assertEquals(TEST_EXPIRES_SECONDS - TEST_RESEND_SECONDS - 1, resendable.expiresRemainingSeconds)
        assertEquals(1, resendable.codesSent)
        viewModel.onEvent(UiAction.OnResendClick)
        testScheduler.runCurrent()
        assertEquals(2, harness.repository.requested.size)
        assertEquals(2, viewModel.state.first().codesSent, "a new code gives the field the keyboard again")
    }

    @Test
    fun rightCodeIsVerifiedThenTheOtpTokenSignsInAndGoesHome() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        val viewModel = harness.viewModel()
        viewModel.state.first { !it.requesting }
        viewModel.onEvent(UiAction.OnCodeChange("12a456"))
        assertEquals("12456", viewModel.state.first().code)
        assertFalse(viewModel.state.first().canVerify)
        viewModel.enterAndVerify(this)
        assertEquals(listOf(AuthPurpose.LOGIN to RIGHT_CODE), harness.repository.verified)
        assertEquals(listOf(TEST_OTP_TOKEN), harness.repository.loggedInWith)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateHome), harness.effects)
        assertEquals("Omar", harness.session.signedInMember?.firstName)
        assertFalse(viewModel.state.first().codeSent, "the code is spent once verified")
    }

    @Test
    fun registerPublishesTheOtpTokenOnceAndOpensTheRegistration() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        harness.viewModel(AuthPurpose.REGISTER).enterAndVerify(this)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateToRegistration(OTP_PHONE)), harness.effects)
        val proof = harness.pending.consume()
        assertEquals(TEST_OTP_TOKEN, proof?.otpToken)
        assertEquals(AuthPurpose.REGISTER, proof?.purpose)
        assertNull(harness.pending.consume())
        assertNull(harness.session.signedInMember)
        assertTrue(harness.repository.loggedInWith.isEmpty())
    }

    @Test
    fun bankDetailsAndChangePhonePublishTheirOtpTokenAndGoBack() = runTest(UnconfinedTestDispatcher()) {
        listOf(AuthPurpose.BANK_DETAILS, AuthPurpose.CHANGE_PHONE).forEach { purpose ->
            val harness = OtpHarness(this)
            harness.viewModel(purpose).enterAndVerify(this)
            assertEquals(listOf<SideEffect>(SideEffect.NavigateBack), harness.effects)
            assertEquals(listOf(purpose to RIGHT_CODE), harness.repository.verified)
            val proof = harness.pending.consume()
            assertEquals(purpose, proof?.purpose)
            assertEquals(TEST_OTP_TOKEN, proof?.otpToken)
        }
    }

    @Test
    fun notAllowedWithABlockShowsTheRemainingTimeAndKeepsVerifyOff() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        harness.repository.policy = OtpPolicy(false, TEST_OTP_LENGTH, TEST_RESEND_SECONDS, blockedUntil = OTP_NOW + BLOCK_SECONDS.seconds)
        val viewModel = harness.viewModel()
        val state = viewModel.state.first { !it.requesting }
        assertEquals(BLOCK_SECONDS, state.blockedRemainingSeconds)
        assertEquals("1:30", formatCountdown(state.blockedRemainingSeconds))
        assertFalse(state.codeSent)
        viewModel.onEvent(UiAction.OnCodeChange(RIGHT_CODE))
        assertFalse(viewModel.state.first().canVerify)
    }

    @Test
    fun aRefusedEarlyRequestKeepsTheLiveCode() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        val viewModel = harness.viewModel()
        viewModel.state.first { !it.requesting }
        harness.repository.policy = OtpPolicy(allowed = false, otpLength = TEST_OTP_LENGTH, resendAfterSeconds = TEST_RESEND_SECONDS)
        viewModel.onEvent(UiAction.OnRetryRequest)
        val state = viewModel.state.first { !it.requesting }
        assertTrue(state.codeSent)
        assertTrue(state.expiresRemainingSeconds > 0)
        viewModel.onEvent(UiAction.OnCodeChange(RIGHT_CODE))
        assertTrue(viewModel.state.first().canVerify)
    }

    @Test
    fun whatsAppDeliveryFailureShowsTheErrorAndRetryAsksAgain() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        harness.repository.requestError = AppError.ServerError(ErrorCode.OTP_DELIVERY_FAILED, HTTP_UNPROCESSABLE, null)
        val viewModel = harness.viewModel()
        val failed = viewModel.state.first { !it.requesting }
        assertEquals(ERROR_TEXT, failed.requestError)
        assertFalse(failed.codeSent)
        viewModel.onEvent(UiAction.OnCodeChange(RIGHT_CODE))
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        assertTrue(harness.repository.verified.isEmpty())
        harness.repository.requestError = null
        viewModel.onEvent(UiAction.OnRetryRequest)
        val sent = viewModel.state.first { !it.requesting }
        assertNull(sent.requestError)
        assertTrue(sent.codeSent)
        assertEquals(2, harness.repository.requested.size)
    }

    private companion object {
        const val HTTP_UNPROCESSABLE = 422
    }

    @Test
    fun comingBackToTheScreenDoesNotRequestASecondCode() = runTest(UnconfinedTestDispatcher()) {
        val harness = OtpHarness(this)
        // No permanent collector: the member leaves for WhatsApp longer than the state timeout, then comes back.
        val viewModel = harness.viewModel(collect = false)
        viewModel.state.first { !it.requesting }
        viewModel.onEvent(UiAction.OnCodeChange("12"))
        testScheduler.advanceTimeBy(AWAY_SECONDS.seconds)
        val back = viewModel.state.first()
        assertEquals(listOf(OTP_E164), harness.repository.requested, "one request per screen")
        assertEquals("12", back.code)
        assertTrue(back.codeSent)
    }
}
