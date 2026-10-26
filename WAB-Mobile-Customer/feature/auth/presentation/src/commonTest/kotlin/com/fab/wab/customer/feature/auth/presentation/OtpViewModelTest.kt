package com.fab.wab.customer.feature.auth.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.common.Clock
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.OtpProof
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.auth.domain.usecase.LoginWithOtpTokenUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.RequestOtpUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.ResolveDialCodeUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.VerifyOtpUseCase
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.OtpDialog
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.SideEffect
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.formatCountdown
import com.fab.wab.customer.feature.auth.presentation.controller.vm.OtpDependencies
import com.fab.wab.customer.feature.auth.presentation.controller.vm.OtpViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds
import kotlin.time.Instant

private val NOW = Instant.parse("2026-10-18T10:00:00Z")
private const val SERVER_ATTEMPTS_TEXT = "Wrong code. 3 attempts left."
private const val SERVICE_UNAVAILABLE_STATUS = 503
private const val DELIVERY_FAILED_STATUS = 422
private const val TOO_MANY_STATUS = 429

@OptIn(ExperimentalCoroutinesApi::class)
class OtpViewModelTest {

    private val repository = OtpFakeAuthRepository()
    private val session = OtpFakeSessionStore()
    private val pending = PendingOtpVerification()
    private val clock = object : Clock {
        override fun now(): Instant = NOW
    }

    private fun TestScope.viewModel(purpose: AuthPurpose = AuthPurpose.LOGIN) = OtpViewModel(
        purpose = purpose,
        phone = OTP_PHONE,
        deps = OtpDependencies(
            requestOtp = RequestOtpUseCase(repository),
            verifyOtp = VerifyOtpUseCase(repository),
            loginWithOtpToken = LoginWithOtpTokenUseCase(repository, { null }, session),
            resolveDialCode = ResolveDialCodeUseCase(OtpFakeLocations()),
            appConfig = OtpNoConfig,
            pending = pending,
            analytics = NoOpAnalyticsTracker,
            clock = clock,
            errorText = { error -> (error as? AppError.ServerError)?.code?.name ?: "failed" },
        ),
        testScope = backgroundScope,
    ).also { viewModel -> backgroundScope.launch { viewModel.state.collect {} } }

    private fun TestScope.effectsOf(viewModel: OtpViewModel): MutableList<SideEffect> =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

    private suspend fun OtpViewModel.typeAndVerify(code: String = "123456") {
        state.first { !it.requesting }
        onEvent(UiAction.OnCodeChange(code))
        onEvent(UiAction.OnVerifyClick)
    }

    @Test
    fun requestsTheWhatsAppCodeAndCountsDownResendAndExpiry() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val ready = viewModel.state.first { !it.requesting }
        assertEquals(OTP_E164, ready.phoneDisplay)
        assertEquals(listOf(OTP_E164 to AuthPurpose.LOGIN), repository.requested)
        assertTrue(ready.codeSent)
        assertEquals(OTP_LENGTH, ready.otpLength)
        assertEquals(OTP_RESEND_SECONDS, ready.resendRemainingSeconds)
        assertEquals(OTP_EXPIRES_SECONDS, ready.expiresRemainingSeconds)
        assertFalse(ready.canResend)
        testScheduler.advanceTimeBy((OTP_RESEND_SECONDS + 1).seconds)
        testScheduler.runCurrent()
        val resendable = viewModel.state.first { it.resendRemainingSeconds == 0 }
        assertTrue(resendable.canResend)
        assertEquals(OTP_EXPIRES_SECONDS - OTP_RESEND_SECONDS - 1, resendable.expiresRemainingSeconds)
        viewModel.onEvent(UiAction.OnResendClick)
        testScheduler.runCurrent()
        assertEquals(2, repository.requested.size)
    }

    @Test
    fun codeExpiryShowsThePopupAndTurnsVerifyOff() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.requesting }
        viewModel.onEvent(UiAction.OnCodeChange("123456"))
        testScheduler.advanceTimeBy((OTP_EXPIRES_SECONDS + 1).seconds)
        testScheduler.runCurrent()
        val expired = viewModel.state.first { it.dialog != null }
        assertEquals(OtpDialog.Expired, expired.dialog)
        assertFalse(expired.canVerify)
        assertTrue(expired.canResend)
    }

    @Test
    fun correctCodeIsVerifiedThenTheTokenLogsIn() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.requesting }
        viewModel.onEvent(UiAction.OnCodeChange("12a456"))
        assertEquals("12456", viewModel.state.first().code)
        viewModel.onEvent(UiAction.OnCodeChange("123456"))
        assertTrue(viewModel.state.first().canVerify)
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        assertEquals(listOf<SideEffect>(SideEffect.NavigateHome), effects)
        assertEquals(listOf(VerifyCall(OTP_E164, AuthPurpose.LOGIN, "123456")), repository.verified)
        assertEquals(listOf(OTP_TOKEN), repository.loginTokens)
        assertEquals("Omar", session.signedIn?.firstName)
    }

    @Test
    fun wrongCodeShowsTheServerAttemptsTextOrTheOwnText() = runTest(UnconfinedTestDispatcher()) {
        repository.verifyResult = AppResult.Error(invalidCode(SERVER_ATTEMPTS_TEXT))
        val viewModel = viewModel()
        viewModel.typeAndVerify("000000")
        testScheduler.runCurrent()
        val wrong = viewModel.state.first { it.codeError }
        assertEquals(SERVER_ATTEMPTS_TEXT, wrong.codeErrorMessage)
        assertFalse(wrong.verifying)
        assertTrue(repository.loginTokens.isEmpty())
        viewModel.onEvent(UiAction.OnCodeChange("00000"))
        assertFalse(viewModel.state.first().codeError)
        repository.verifyResult = AppResult.Error(serverError(ErrorCode.OTP_INVALID, UNAUTHORIZED_STATUS))
        viewModel.onEvent(UiAction.OnCodeChange("000001"))
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        val own = viewModel.state.first { it.codeError }
        assertNull(own.codeErrorMessage)
    }

    @Test
    fun blockedOnVerifyClearsTheCodeAndTheNextRequestShowsTheRemainingTime() = runTest(UnconfinedTestDispatcher()) {
        repository.verifyResult = AppResult.Error(serverError(ErrorCode.OTP_BLOCKED, TOO_MANY_STATUS))
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.typeAndVerify("000000")
        testScheduler.runCurrent()
        val state = viewModel.state.first()
        assertFalse(state.codeSent)
        assertEquals("", state.code)
        assertEquals(listOf<SideEffect>(SideEffect.ShowError(ErrorCode.OTP_BLOCKED.name)), effects)
        repository.policy = AppResult.Success(OtpPolicy(false, OTP_LENGTH, OTP_RESEND_SECONDS, blockedUntil = NOW + 15.minutes))
        viewModel.onEvent(UiAction.OnResendClick)
        testScheduler.runCurrent()
        val blocked = viewModel.state.first { it.isBlocked }
        assertEquals("15:00", formatCountdown(blocked.blockedRemainingSeconds))
        assertFalse(blocked.canVerify)
        assertFalse(blocked.canResend)
    }

    @Test
    fun expiredCodeAndARefusedTokenBothAskForANewCode() = runTest(UnconfinedTestDispatcher()) {
        repository.verifyResult = AppResult.Error(serverError(ErrorCode.OTP_EXPIRED, UNAUTHORIZED_STATUS))
        val viewModel = viewModel()
        viewModel.typeAndVerify()
        testScheduler.runCurrent()
        assertEquals(OtpDialog.Expired, viewModel.state.first().dialog)
        viewModel.onEvent(UiAction.OnDialogDismiss)
        assertNull(viewModel.state.first().dialog)

        repository.verifyResult = AppResult.Success(OtpProof(OTP_TOKEN, 1))
        repository.loginResult = AppResult.Error(serverError(ErrorCode.OTP_INVALID, UNAUTHORIZED_STATUS))
        testScheduler.advanceTimeBy((OTP_RESEND_SECONDS + 1).seconds)
        testScheduler.runCurrent()
        viewModel.onEvent(UiAction.OnResendClick)
        testScheduler.runCurrent()
        assertEquals(2, repository.requested.size)
        viewModel.typeAndVerify()
        testScheduler.runCurrent()
        val refused = viewModel.state.first { it.dialog != null }
        assertEquals(OtpDialog.Expired, refused.dialog)
        assertFalse(refused.codeSent)
        assertTrue(refused.canResend)
    }

    @Test
    fun failedSignInAfterVerifyNeedsANewCode() = runTest(UnconfinedTestDispatcher()) {
        repository.loginResult = AppResult.Error(serverError(ErrorCode.INTERNAL, SERVICE_UNAVAILABLE_STATUS))
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.typeAndVerify()
        testScheduler.runCurrent()
        assertEquals(listOf<SideEffect>(SideEffect.ShowError(ErrorCode.INTERNAL.name)), effects)
        val state = viewModel.state.first()
        assertFalse(state.codeSent)
        assertTrue(state.canResend)
        viewModel.onEvent(UiAction.OnCodeChange("123456"))
        assertFalse(viewModel.state.first().canVerify)
    }

    @Test
    fun otherPurposesPublishTheTokenAndGoBack() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(AuthPurpose.BOOKING_CONFIRMATION)
        val effects = effectsOf(viewModel)
        viewModel.typeAndVerify()
        testScheduler.runCurrent()
        assertEquals(listOf<SideEffect>(SideEffect.NavigateBack), effects)
        assertEquals(listOf(OTP_E164 to AuthPurpose.BOOKING_CONFIRMATION), repository.requested)
        assertEquals(AuthPurpose.BOOKING_CONFIRMATION, repository.verified.single().purpose)
        val proof = pending.consume()
        assertEquals(OTP_TOKEN, proof?.otpToken)
        assertEquals(AuthPurpose.BOOKING_CONFIRMATION, proof?.purpose)
        assertNull(pending.consume())
        assertTrue(repository.loginTokens.isEmpty())
        assertNull(session.signedIn)
    }

    @Test
    fun notAllowedWithoutBlockKeepsTheEarlierCodeUsable() = runTest(UnconfinedTestDispatcher()) {
        repository.policy = AppResult.Success(OtpPolicy(false, OTP_LENGTH, OTP_RESEND_SECONDS))
        val viewModel = viewModel()
        val state = viewModel.state.first { !it.requesting }
        assertTrue(state.codeSent)
        assertFalse(state.isBlocked)
        assertEquals(OTP_RESEND_SECONDS, state.resendRemainingSeconds)
        assertEquals(0, state.expiresRemainingSeconds)
    }

    @Test
    fun numberWithoutWhatsAppShowsTheDeliveryErrorAndKeepsVerifyOff() = runTest(UnconfinedTestDispatcher()) {
        repository.policy = AppResult.Error(serverError(ErrorCode.OTP_DELIVERY_FAILED, DELIVERY_FAILED_STATUS))
        val viewModel = viewModel()
        val failed = viewModel.state.first { !it.requesting }
        assertFalse(failed.codeSent)
        assertEquals(ErrorCode.OTP_DELIVERY_FAILED.name, failed.requestError)
        viewModel.onEvent(UiAction.OnCodeChange("123456"))
        viewModel.onEvent(UiAction.OnVerifyClick)
        testScheduler.runCurrent()
        assertTrue(repository.verified.isEmpty())
        repository.policy = AppResult.Success(OtpPolicy(true, OTP_LENGTH, OTP_RESEND_SECONDS, OTP_EXPIRES_SECONDS))
        viewModel.onEvent(UiAction.OnRetryRequest)
        testScheduler.runCurrent()
        val retried = viewModel.state.first { it.codeSent }
        assertNull(retried.requestError)
    }
}
