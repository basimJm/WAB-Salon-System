package com.fab.wab.merchant.feature.auth.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.common.Clock
import com.fab.wab.merchant.core.common.SystemClock
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.textfield.sanitizeOtp
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.model.toDisplay
import com.fab.wab.merchant.feature.auth.domain.model.toE164
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.merchant.feature.auth.domain.usecase.LoginWithOtpTokenUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.RequestOtpUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.ResolveDialCodeUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.VerifyOtpUseCase
import com.fab.wab.merchant.feature.auth.presentation.analytics.OtpAnalytics
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.OtpDialog
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.SideEffect
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.seconds
import kotlin.time.Instant

/** Collaborators of the OTP screen (PRD M03 / S13): WhatsApp code request + verify on the backend, login, session. */
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
 * BUSINESS_DOMAIN §3.1a: `otp/request` (the backend sends the code on WhatsApp) → the member types it → `otp/verify`
 * answers a single-use `otpToken` → LOGIN signs in with it, the other purposes hand it to their caller.
 */
class OtpViewModel(
    private val purpose: AuthPurpose,
    private val phone: PhoneNumber,
    private val deps: OtpDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(purpose = purpose), testScope) {

    private var phoneE164: String = phone.number
    private var countdownJob: Job? = null
    private var requested = false

    /**
     * `onStart` runs again whenever the screen re-subscribes (e.g. back from WhatsApp after copying the code, more
     * than the state timeout later). The code is requested once per screen: a second request would replace the code
     * the member just read (or count against the request limit).
     */
    override fun onStart() {
        if (requested) return
        requested = true
        scope.launch {
            val dialCode = (deps.resolveDialCode(phone.countryCode) as? AppResult.Success)?.data.orEmpty()
            phoneE164 = phone.toE164(dialCode)
            updateState { copy(phoneDisplay = phone.toDisplay(dialCode)) }
            requestCode(isResend = false)
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnCodeChange ->
                updateState { copy(code = sanitizeOtp(event.value, otpLength), codeError = false, codeErrorMessage = null) }
            UiAction.OnVerifyClick -> verify()
            UiAction.OnResendClick -> if (state.value.canResend) scope.launch { requestCode(isResend = true) }
            UiAction.OnDialogDismiss -> updateState { copy(dialog = null) }
            UiAction.OnRetryRequest -> scope.launch { requestCode(isResend = false) }
        }
    }

    /** A refused request (too early, blocked) leaves a code that is still live usable; only a new code clears the box. */
    private suspend fun requestCode(isResend: Boolean) {
        updateState { copy(requesting = true, requestError = null) }
        when (val result = deps.requestOtp(phoneE164, purpose)) {
            is AppResult.Success -> applyPolicy(result.data, isResend)
            is AppResult.Error -> {
                val message = deps.errorText(result.appError)
                updateState { copy(requesting = false, requestError = message) }
            }
            AppResult.Loading -> Unit
        }
    }

    private fun applyPolicy(policy: OtpPolicy, isResend: Boolean, tracked: Boolean = true) {
        val fallback = deps.appConfig.current.value?.otp
        val length = policy.otpLength.takeIf { it > 0 } ?: fallback?.length ?: 0
        val resendAfter = policy.resendAfterSeconds.takeIf { it > 0 } ?: fallback?.resendAfterSeconds ?: 0
        if (tracked) track(if (isResend) OtpAnalytics.ACTION_RESEND else OtpAnalytics.ACTION_REQUEST)
        if (!policy.allowed) {
            val blockedFor = policy.blockedUntil?.let { remainingSeconds(it) } ?: resendAfter
            updateState { copy(requesting = false, otpLength = length) }
            val hasBlock = policy.blockedUntil != null
            startCountdown(
                resend = if (hasBlock) 0 else blockedFor,
                blocked = if (hasBlock) blockedFor else 0,
                expires = state.value.expiresRemainingSeconds,
            )
            return
        }
        updateState {
            copy(
                requesting = false,
                codeSent = true,
                codesSent = codesSent + 1,
                otpLength = length,
                code = "",
                codeError = false,
                codeErrorMessage = null,
            )
        }
        startCountdown(resend = resendAfter, blocked = 0, expires = policy.expiresInSeconds)
    }

    private fun verify() {
        val current = state.value
        if (!current.canVerify) return
        scope.launch {
            updateState { copy(verifying = true) }
            when (val result = deps.verifyOtp(phoneE164, purpose, current.code)) {
                is AppResult.Success -> complete(result.data.otpToken)
                is AppResult.Error -> onVerifyError(result.appError)
                AppResult.Loading -> Unit
            }
        }
    }

    private suspend fun complete(otpToken: String) {
        // The code is spent on the server: whatever happens next needs a new one.
        updateState { copy(codeSent = false, expiresRemainingSeconds = 0) }
        if (purpose == AuthPurpose.LOGIN) {
            when (val login = deps.loginWithOtpToken(phone, otpToken)) {
                is AppResult.Success -> {
                    track(OtpAnalytics.ACTION_VERIFY_SUCCESS)
                    updateState { copy(verifying = false) }
                    emitSideEffect(SideEffect.NavigateHome)
                }
                is AppResult.Error -> onLoginError(login.appError)
                AppResult.Loading -> Unit
            }
        } else {
            deps.pending.publish(OtpVerified(purpose, phone, otpToken))
            track(OtpAnalytics.ACTION_VERIFY_SUCCESS)
            updateState { copy(verifying = false) }
            emitSideEffect(if (purpose == AuthPurpose.REGISTER) SideEffect.NavigateToRegistration(phone) else SideEffect.NavigateBack)
        }
    }

    /** `OTP_INVALID` keeps the code for correction; `OTP_EXPIRED` offers a new code; `OTP_BLOCKED` ends this code. */
    private suspend fun onVerifyError(error: AppError) {
        val server = error as? AppError.ServerError
        track(OtpAnalytics.ACTION_VERIFY_FAIL, server?.code?.name.orEmpty())
        when (server?.code) {
            ErrorCode.OTP_INVALID -> {
                val line = server.details
                    .firstOrNull { it.code == ErrorCode.OTP_INVALID.name }
                    ?.message?.takeIf { it.isNotBlank() }
                updateState { copy(verifying = false, codeError = true, codeErrorMessage = line) }
            }
            ErrorCode.OTP_EXPIRED -> expire()
            ErrorCode.OTP_BLOCKED -> {
                updateState { copy(verifying = false, codeSent = false, code = "", expiresRemainingSeconds = 0) }
                showBlock(error)
            }
            else -> showError(error)
        }
    }

    /**
     * `OTP_BLOCKED` on verify carries no end time; only `otp/request` answers it (a blocked phone gets
     * `allowed: false` + `blockedUntil` and no code is sent), so the screen asks once and shows the blocked banner with
     * the remaining time (design `otpBlocked`). If that request fails, the block message is shown instead.
     */
    private suspend fun showBlock(blocked: AppError) {
        when (val result = deps.requestOtp(phoneE164, purpose)) {
            is AppResult.Success -> applyPolicy(result.data, isResend = true, tracked = false)
            is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(blocked)))
            AppResult.Loading -> Unit
        }
    }

    /** The `otpToken` is single use: a failed sign-in after a right code always needs a new code. */
    private suspend fun onLoginError(error: AppError) {
        val code = (error as? AppError.ServerError)?.code
        track(OtpAnalytics.ACTION_VERIFY_FAIL, code?.name.orEmpty())
        updateState { copy(code = "") }
        if (code == ErrorCode.OTP_INVALID || code == ErrorCode.OTP_EXPIRED) expire() else showError(error)
    }

    private fun expire() {
        updateState { copy(verifying = false, codeSent = false, expiresRemainingSeconds = 0, dialog = OtpDialog.Expired) }
    }

    private suspend fun showError(error: AppError) {
        val message = deps.errorText(error)
        updateState { copy(verifying = false) }
        emitSideEffect(SideEffect.ShowError(message))
    }

    private fun startCountdown(resend: Int, blocked: Int, expires: Int) {
        countdownJob?.cancel()
        updateState { copy(resendRemainingSeconds = resend, blockedRemainingSeconds = blocked, expiresRemainingSeconds = expires) }
        countdownJob = scope.launch {
            while (state.value.hasRunningTimer()) {
                delay(TICK)
                val before = state.value
                updateState {
                    copy(
                        resendRemainingSeconds = (resendRemainingSeconds - 1).coerceAtLeast(0),
                        blockedRemainingSeconds = (blockedRemainingSeconds - 1).coerceAtLeast(0),
                        expiresRemainingSeconds = (expiresRemainingSeconds - 1).coerceAtLeast(0),
                    )
                }
                val codeRanOut = before.expiresRemainingSeconds > 0 && state.value.expiresRemainingSeconds == 0
                if (codeRanOut && state.value.codeSent && !state.value.verifying) expire()
            }
        }
    }

    private fun UiState.hasRunningTimer(): Boolean =
        resendRemainingSeconds > 0 || blockedRemainingSeconds > 0 || expiresRemainingSeconds > 0

    private fun remainingSeconds(until: Instant): Int =
        (until - deps.clock.now()).inWholeSeconds.toInt().coerceAtLeast(0)

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
