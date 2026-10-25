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
import com.fab.wab.merchant.core.firebase.FirebaseFailure
import com.fab.wab.merchant.core.firebase.FirebaseResult
import com.fab.wab.merchant.core.firebase.PhoneAuthGateway
import com.fab.wab.merchant.core.firebase.PhoneVerification
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.textfield.sanitizeOtp
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.OtpPolicy
import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.model.toE164
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.merchant.feature.auth.domain.usecase.LoginWithIdTokenUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.ReportWrongOtpAttemptUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.RequestOtpUseCase
import com.fab.wab.merchant.feature.auth.domain.usecase.ResolveDialCodeUseCase
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

/** Collaborators of the OTP screen (PRD S13): backend pre-check + wrong-attempt report, Firebase, login, session. */
class OtpDependencies(
    val requestOtp: RequestOtpUseCase,
    val reportWrongAttempt: ReportWrongOtpAttemptUseCase,
    val loginWithIdToken: LoginWithIdTokenUseCase,
    val resolveDialCode: ResolveDialCodeUseCase,
    val phoneAuth: PhoneAuthGateway,
    val appConfig: AppConfigRepository,
    val pending: PendingOtpVerification,
    val analytics: AnalyticsTracker,
    val clock: Clock = SystemClock,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

class OtpViewModel(
    private val purpose: AuthPurpose,
    private val phone: PhoneNumber,
    private val deps: OtpDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(purpose = purpose), testScope) {

    private var phoneE164: String = phone.number
    private var verification: PhoneVerification? = null
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
            is UiAction.OnCodeChange -> updateState { copy(code = sanitizeOtp(event.value, otpLength), codeError = false) }
            UiAction.OnVerifyClick -> verify()
            UiAction.OnResendClick -> if (state.value.canResend) scope.launch { requestCode(isResend = true) }
            UiAction.OnDialogDismiss -> updateState { copy(dialog = null) }
            UiAction.OnRetryRequest -> scope.launch { requestCode(isResend = false) }
        }
    }

    private suspend fun requestCode(isResend: Boolean) {
        updateState { copy(requesting = true, codeSent = false, requestError = null, code = "", codeError = false) }
        when (val result = deps.requestOtp(phoneE164, purpose)) {
            is AppResult.Success -> applyPolicy(result.data, isResend)
            is AppResult.Error -> {
                val message = deps.errorText(result.appError)
                updateState { copy(requesting = false, requestError = message) }
            }
            AppResult.Loading -> Unit
        }
    }

    private suspend fun applyPolicy(policy: OtpPolicy, isResend: Boolean) {
        val fallback = deps.appConfig.current.value?.otp
        val length = policy.otpLength.takeIf { it > 0 } ?: fallback?.length ?: 0
        val resendAfter = policy.resendAfterSeconds.takeIf { it > 0 } ?: fallback?.resendAfterSeconds ?: 0
        track(if (isResend) OtpAnalytics.ACTION_RESEND else OtpAnalytics.ACTION_REQUEST)
        if (!policy.allowed) {
            val blockedFor = policy.blockedUntil?.let { remainingSeconds(it) } ?: resendAfter
            updateState { copy(requesting = false, otpLength = length) }
            val hasBlock = policy.blockedUntil != null
            startCountdown(resend = if (hasBlock) 0 else blockedFor, blocked = if (hasBlock) blockedFor else 0)
            return
        }
        when (val started = deps.phoneAuth.startVerification(phoneE164)) {
            is FirebaseResult.Success -> {
                verification = started.value
                updateState { copy(requesting = false, codeSent = true, otpLength = length) }
                startCountdown(resend = resendAfter, blocked = 0)
                started.value.autoVerifiedIdToken?.let { complete(it) }
            }
            is FirebaseResult.Failure -> {
                verification = null
                val message = failureMessage(started.failure)
                updateState { copy(requesting = false, otpLength = length, requestError = message) }
            }
        }
    }

    private fun verify() {
        val current = state.value
        val pending = verification
        if (!current.canVerify || pending == null) return
        scope.launch {
            updateState { copy(verifying = true) }
            when (val result = deps.phoneAuth.confirm(pending, current.code)) {
                is FirebaseResult.Success -> complete(result.value)
                is FirebaseResult.Failure -> onConfirmFailure(result.failure)
            }
        }
    }

    private suspend fun complete(idToken: String) {
        if (purpose == AuthPurpose.LOGIN) {
            when (val login = deps.loginWithIdToken(phone, idToken)) {
                is AppResult.Success -> {
                    track(OtpAnalytics.ACTION_VERIFY_SUCCESS)
                    updateState { copy(verifying = false) }
                    emitSideEffect(SideEffect.NavigateHome)
                }
                is AppResult.Error -> onLoginError(login.appError)
                AppResult.Loading -> Unit
            }
        } else {
            deps.pending.publish(OtpVerified(purpose, phone, idToken))
            track(OtpAnalytics.ACTION_VERIFY_SUCCESS)
            updateState { copy(verifying = false) }
            emitSideEffect(if (purpose == AuthPurpose.REGISTER) SideEffect.NavigateToRegistration(phone) else SideEffect.NavigateBack)
        }
    }

    private suspend fun onConfirmFailure(failure: FirebaseFailure) {
        track(OtpAnalytics.ACTION_VERIFY_FAIL, failure::class.simpleName.orEmpty())
        when (failure) {
            FirebaseFailure.InvalidCode -> {
                updateState { copy(verifying = false, codeError = true) }
                val report = deps.reportWrongAttempt(phoneE164)
                val blockedUntil = (report as? AppResult.Success)?.data?.takeIf { it.blocked }?.blockedUntil
                if (blockedUntil != null) startCountdown(resend = 0, blocked = remainingSeconds(blockedUntil))
            }
            FirebaseFailure.CodeExpired -> updateState { copy(verifying = false, dialog = OtpDialog.Expired) }
            else -> {
                val message = failureMessage(failure)
                updateState { copy(verifying = false) }
                emitSideEffect(SideEffect.ShowError(message))
            }
        }
    }

    private suspend fun onLoginError(error: AppError) {
        track(OtpAnalytics.ACTION_VERIFY_FAIL, (error as? AppError.ServerError)?.code?.name.orEmpty())
        val code = (error as? AppError.ServerError)?.code
        when (code) {
            ErrorCode.OTP_INVALID -> updateState { copy(verifying = false, codeError = true) }
            ErrorCode.OTP_EXPIRED -> updateState { copy(verifying = false, dialog = OtpDialog.Expired) }
            else -> {
                val message = deps.errorText(error)
                updateState { copy(verifying = false) }
                emitSideEffect(SideEffect.ShowError(message))
            }
        }
    }

    private fun startCountdown(resend: Int, blocked: Int) {
        countdownJob?.cancel()
        updateState { copy(resendRemainingSeconds = resend, blockedRemainingSeconds = blocked) }
        countdownJob = scope.launch {
            while (state.value.resendRemainingSeconds > 0 || state.value.blockedRemainingSeconds > 0) {
                delay(TICK)
                updateState {
                    copy(
                        resendRemainingSeconds = (resendRemainingSeconds - 1).coerceAtLeast(0),
                        blockedRemainingSeconds = (blockedRemainingSeconds - 1).coerceAtLeast(0),
                    )
                }
            }
        }
    }

    private fun remainingSeconds(until: Instant): Int =
        (until - deps.clock.now()).inWholeSeconds.toInt().coerceAtLeast(0)

    private suspend fun failureMessage(failure: FirebaseFailure): String = deps.errorText(failure.toAppError())

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

/** Firebase failures as the shared error catalog expresses them (PRD S13 messages). */
fun FirebaseFailure.toAppError(): AppError = when (this) {
    FirebaseFailure.InvalidCode -> AppError.ServerError(ErrorCode.OTP_INVALID, 0, null)
    FirebaseFailure.CodeExpired -> AppError.ServerError(ErrorCode.OTP_EXPIRED, 0, null)
    FirebaseFailure.TooManyRequests -> AppError.ServerError(ErrorCode.RATE_LIMITED, 0, null)
    FirebaseFailure.InvalidPhone -> AppError.ServerError(ErrorCode.VALIDATION_ERROR, 0, null)
    FirebaseFailure.Network -> AppError.NetworkError("")
    FirebaseFailure.Unavailable -> AppError.UnknownError("")
    is FirebaseFailure.Unknown -> AppError.UnknownError(message.orEmpty())
}
