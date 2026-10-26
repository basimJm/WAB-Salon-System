package com.fab.wab.customer.feature.auth.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.common.Clock
import com.fab.wab.customer.core.common.SystemClock
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.config.AppConfigRepository
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.designsystem.components.textfield.sanitizeOtp
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.OtpFailure
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.OtpVerified
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.otpFailureOf
import com.fab.wab.customer.feature.auth.domain.model.toE164
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.auth.domain.usecase.LoginWithOtpTokenUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.RequestOtpUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.ResolveDialCodeUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.VerifyOtpUseCase
import com.fab.wab.customer.feature.auth.presentation.analytics.OtpAnalytics
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.OtpDialog
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.SideEffect
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.seconds
import kotlin.time.Instant

/** Collaborators of the OTP screen (PRD S13, BUSINESS_DOMAIN §3.1a): WhatsApp code request + verify, login, session. */
class OtpDependencies(
    val requestOtp: RequestOtpUseCase,
    val verifyOtp: VerifyOtpUseCase,
    val loginWithOtpToken: LoginWithOtpTokenUseCase,
    val resolveDialCode: ResolveDialCodeUseCase,
    val appConfig: AppConfigRepository,
    val pending: PendingOtpVerification,
    val analytics: AnalyticsTracker,
    val clock: Clock = SystemClock,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/**
 * S13: the server sends the code on WhatsApp (`otp/request`), checks it (`otp/verify`) and answers a single-use
 * `otpToken`; LOGIN signs in with it here, the other purposes hand it back through [PendingOtpVerification].
 */
class OtpViewModel(
    private val purpose: AuthPurpose,
    private val phone: PhoneNumber,
    private val deps: OtpDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(purpose = purpose), testScope) {

    private var phoneE164: String = phone.number
    private var countdownJob: Job? = null

    override fun onStart() {
        scope.launch {
            val dialCode = (deps.resolveDialCode(phone.countryCode) as? AppResult.Success)?.data.orEmpty()
            phoneE164 = phone.toE164(dialCode)
            updateState { copy(phoneDisplay = phoneE164) }
            requestCode(isResend = false)
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnCodeChange ->
                updateState { copy(code = sanitizeOtp(event.value, otpLength), codeError = false, codeErrorMessage = null) }
            UiAction.OnVerifyClick -> verify()
            UiAction.OnResendClick -> if (uiState.value.canResend) scope.launch { requestCode(isResend = true) }
            UiAction.OnDialogDismiss -> updateState { copy(dialog = null) }
            UiAction.OnRetryRequest -> scope.launch { requestCode(isResend = false) }
        }
    }

    private suspend fun requestCode(isResend: Boolean) {
        updateState {
            copy(requesting = true, codeSent = false, requestError = null, code = "", codeError = false, codeErrorMessage = null)
        }
        when (val result = deps.requestOtp(phoneE164, purpose)) {
            is AppResult.Success -> applyPolicy(result.data, isResend)
            is AppResult.Error -> {
                track(OtpAnalytics.ACTION_REQUEST_FAIL, reasonOf(result.appError))
                val message = deps.errorText(result.appError)
                updateState { copy(requesting = false, requestError = message) }
            }
            AppResult.Loading -> Unit
        }
    }

    private fun applyPolicy(policy: OtpPolicy, isResend: Boolean) {
        val fallback = deps.appConfig.current.value?.otp
        val length = policy.otpLength.takeIf { it > 0 } ?: fallback?.length ?: 0
        val resendAfter = policy.resendAfterSeconds.takeIf { it > 0 } ?: fallback?.resendAfterSeconds ?: 0
        track(if (isResend) OtpAnalytics.ACTION_RESEND else OtpAnalytics.ACTION_REQUEST)
        if (policy.allowed) {
            updateState { copy(requesting = false, codeSent = true, otpLength = length) }
            startCountdown(resend = resendAfter, blocked = 0, expires = policy.expiresInSeconds)
            return
        }
        val blockedUntil = policy.blockedUntil
        if (blockedUntil != null) {
            updateState { copy(requesting = false, otpLength = length) }
            startCountdown(resend = 0, blocked = remainingSeconds(blockedUntil), expires = 0)
        } else {
            // Resend countdown still running: the code sent a moment ago stays valid on the server, so it can be typed.
            updateState { copy(requesting = false, codeSent = true, otpLength = length) }
            startCountdown(resend = resendAfter, blocked = 0, expires = 0)
        }
    }

    private fun verify() {
        val current = uiState.value
        if (!current.canVerify) return
        scope.launch {
            updateState { copy(verifying = true, codeError = false, codeErrorMessage = null) }
            when (val result = deps.verifyOtp(phoneE164, purpose, current.code)) {
                is AppResult.Success -> complete(result.data.otpToken)
                is AppResult.Error -> onVerifyError(result.appError)
                AppResult.Loading -> Unit
            }
        }
    }

    private suspend fun complete(otpToken: String) {
        // A right code ends the server's resend countdown and the code itself.
        stopCountdown()
        if (purpose != AuthPurpose.LOGIN) {
            deps.pending.publish(OtpVerified(purpose, phone, otpToken))
            track(OtpAnalytics.ACTION_VERIFY_SUCCESS)
            updateState { copy(verifying = false) }
            emitSideEffect(SideEffect.NavigateBack)
            return
        }
        when (val login = deps.loginWithOtpToken(phone, otpToken)) {
            is AppResult.Success -> {
                track(OtpAnalytics.ACTION_VERIFY_SUCCESS)
                updateState { copy(verifying = false) }
                emitSideEffect(SideEffect.NavigateHome)
            }
            is AppResult.Error -> onLoginError(login.appError)
            AppResult.Loading -> Unit
        }
    }

    private suspend fun onVerifyError(error: AppError) {
        track(OtpAnalytics.ACTION_VERIFY_FAIL, reasonOf(error))
        when (val failure = otpFailureOf(error)) {
            is OtpFailure.InvalidCode ->
                updateState { copy(verifying = false, codeError = true, codeErrorMessage = failure.serverMessage) }
            OtpFailure.Expired -> expire()
            OtpFailure.Blocked -> {
                // The verify answer has no `blockedUntil`; the next request shows the remaining time.
                stopCountdown()
                updateState { copy(verifying = false, codeSent = false, code = "") }
                emitSideEffect(SideEffect.ShowError(deps.errorText(error)))
            }
            OtpFailure.DeliveryFailed, is OtpFailure.Other -> {
                updateState { copy(verifying = false) }
                emitSideEffect(SideEffect.ShowError(deps.errorText(error)))
            }
        }
    }

    /** The `otpToken` is single use: whatever made the sign-in fail, the next try needs a new code. */
    private suspend fun onLoginError(error: AppError) {
        track(OtpAnalytics.ACTION_VERIFY_FAIL, reasonOf(error))
        when (otpFailureOf(error)) {
            is OtpFailure.InvalidCode, OtpFailure.Expired -> expire()
            else -> {
                updateState { copy(verifying = false, codeSent = false, code = "") }
                emitSideEffect(SideEffect.ShowError(deps.errorText(error)))
            }
        }
    }

    private fun expire() {
        updateState { copy(verifying = false, codeSent = false, code = "", expiresRemainingSeconds = 0, dialog = OtpDialog.Expired) }
    }

    private fun stopCountdown() {
        countdownJob?.cancel()
        updateState { copy(resendRemainingSeconds = 0, blockedRemainingSeconds = 0, expiresRemainingSeconds = 0) }
    }

    private fun startCountdown(resend: Int, blocked: Int, expires: Int) {
        countdownJob?.cancel()
        updateState {
            copy(
                resendRemainingSeconds = resend.coerceAtLeast(0),
                blockedRemainingSeconds = blocked.coerceAtLeast(0),
                expiresRemainingSeconds = expires.coerceAtLeast(0),
            )
        }
        countdownJob = scope.launch {
            while (uiState.value.hasRunningCountdown()) {
                delay(TICK)
                tick()
            }
        }
    }

    private fun tick() {
        val before = uiState.value
        updateState {
            copy(
                resendRemainingSeconds = (resendRemainingSeconds - 1).coerceAtLeast(0),
                blockedRemainingSeconds = (blockedRemainingSeconds - 1).coerceAtLeast(0),
                expiresRemainingSeconds = (expiresRemainingSeconds - 1).coerceAtLeast(0),
            )
        }
        val expiredNow = before.expiresRemainingSeconds > 0 && uiState.value.expiresRemainingSeconds == 0
        if (expiredNow && uiState.value.codeSent && !uiState.value.verifying) expire()
    }

    private fun UiState.hasRunningCountdown(): Boolean =
        resendRemainingSeconds > 0 || blockedRemainingSeconds > 0 || expiresRemainingSeconds > 0

    private fun remainingSeconds(until: Instant): Int =
        (until - deps.clock.now()).inWholeSeconds.toInt().coerceAtLeast(0)

    private fun reasonOf(error: AppError): String =
        (error as? AppError.ServerError)?.code?.takeIf { it != ErrorCode.UNKNOWN }?.name ?: error::class.simpleName.orEmpty()

    private fun track(name: String, reason: String? = null) {
        deps.analytics.trackAction(
            AnalyticsAction(
                name,
                analyticsParams {
                    text(OtpAnalytics.PARAM_PURPOSE, purpose.code.lowercase())
                    reason?.takeIf { it.isNotBlank() }?.let { text(OtpAnalytics.PARAM_REASON, it.lowercase()) }
                },
            ),
        )
    }

    private companion object {
        val TICK = 1.seconds
    }
}
