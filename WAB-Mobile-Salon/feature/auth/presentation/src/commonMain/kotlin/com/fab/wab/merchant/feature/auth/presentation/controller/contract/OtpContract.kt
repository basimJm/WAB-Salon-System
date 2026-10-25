package com.fab.wab.merchant.feature.auth.presentation.controller.contract

import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber

sealed interface OtpContract {
    /**
     * PRD M03 states: empty with countdown, filled, verifying, wrong code, countdown finished (resend active),
     * expired (popup), blocked (remaining time). [otpLength] always comes from the backend.
     */
    data class UiState(
        val purpose: AuthPurpose = AuthPurpose.LOGIN,
        val phoneDisplay: String = "",
        val code: String = "",
        val otpLength: Int = 0,
        val requesting: Boolean = true,
        /** Firebase confirmed it sent a code; Verify stays off until then (a failed send leaves nothing to confirm). */
        val codeSent: Boolean = false,
        val verifying: Boolean = false,
        val codeError: Boolean = false,
        val resendRemainingSeconds: Int = 0,
        val blockedRemainingSeconds: Int = 0,
        val dialog: OtpDialog? = null,
        val requestError: String? = null,
    ) {
        val isBlocked: Boolean get() = blockedRemainingSeconds > 0
        val canVerify: Boolean get() =
            codeSent && otpLength > 0 && code.length == otpLength && !verifying && !isBlocked && !requesting
        val canResend: Boolean get() = resendRemainingSeconds == 0 && !isBlocked && !requesting && !verifying
    }

    enum class OtpDialog { Expired }

    sealed interface UiAction {
        data class OnCodeChange(val value: String) : UiAction
        data object OnVerifyClick : UiAction
        data object OnResendClick : UiAction
        data object OnDialogDismiss : UiAction
        data object OnRetryRequest : UiAction
    }

    sealed interface SideEffect {
        /** LOGIN done: the session is stored, the launch router takes over. */
        data object NavigateHome : SideEffect

        /** REGISTER proven: the salon registration form (M04) consumes the published proof. */
        data class NavigateToRegistration(val phone: PhoneNumber) : SideEffect

        /** CHANGE_PHONE / BANK_DETAILS: the proof was published, the caller continues. */
        data object NavigateBack : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

/** `0:45` for the resend countdown and the remaining block time (design script S13). */
fun formatCountdown(totalSeconds: Int): String {
    val seconds = totalSeconds.coerceAtLeast(0)
    val minutes = seconds / SECONDS_PER_MINUTE
    val rest = seconds % SECONDS_PER_MINUTE
    return "$minutes:${rest.toString().padStart(COUNTDOWN_SECONDS_WIDTH, COUNTDOWN_PAD)}"
}

private const val SECONDS_PER_MINUTE = 60
private const val COUNTDOWN_SECONDS_WIDTH = 2
private const val COUNTDOWN_PAD = '0'
