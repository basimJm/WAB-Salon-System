package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.dialog.AppDialog
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.navigation.AppTopBar
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppOtpInput
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.presentation.analytics.OtpAnalytics
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.OtpDialog
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.UiState
import com.fab.wab.customer.feature.auth.presentation.controller.contract.formatCountdown
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.otp_blocked
import com.fab.wab.customer.feature.auth.presentation.resources.otp_expired_body
import com.fab.wab.customer.feature.auth.presentation.resources.otp_expired_ok
import com.fab.wab.customer.feature.auth.presentation.resources.otp_expired_title
import com.fab.wab.customer.feature.auth.presentation.resources.otp_remaining
import com.fab.wab.customer.feature.auth.presentation.resources.otp_resend
import com.fab.wab.customer.feature.auth.presentation.resources.otp_resend_in
import com.fab.wab.customer.feature.auth.presentation.resources.otp_sent_to
import com.fab.wab.customer.feature.auth.presentation.resources.otp_title
import com.fab.wab.customer.feature.auth.presentation.resources.otp_title_booking
import com.fab.wab.customer.feature.auth.presentation.resources.otp_verify
import com.fab.wab.customer.feature.auth.presentation.resources.otp_wrong
import org.jetbrains.compose.resources.stringResource

/** S13: title by purpose, "we sent a code to {phone}", N boxes from the backend, Verify, resend countdown, block. */
@Composable
fun OtpScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    TrackScreen(OtpAnalytics.SCREEN)
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    val title = if (state.purpose == AuthPurpose.BOOKING_CONFIRMATION) Res.string.otp_title_booking else Res.string.otp_title
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(title), onBack = onBack) }) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(spacing.space24),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.space20),
        ) {
            AppText(
                text = stringResource(Res.string.otp_sent_to, state.phoneDisplay),
                style = AppTheme.typography.bodyLarge,
                color = colors.muted,
                textAlign = TextAlign.Center,
            )
            if (state.requestError != null) {
                AppErrorState(onRetry = { onAction(UiAction.OnRetryRequest) }, message = state.requestError)
                return@Column
            }
            if (state.otpLength > 0) {
                AppOtpInput(
                    value = state.code,
                    onValueChange = { onAction(UiAction.OnCodeChange(it)) },
                    length = state.otpLength,
                    error = state.codeError,
                    enabled = !state.isBlocked && !state.verifying,
                )
            }
            if (state.codeError) {
                AppText(text = stringResource(Res.string.otp_wrong), color = colors.danger, textAlign = TextAlign.Center)
            }
            AppPrimaryButton(
                text = stringResource(Res.string.otp_verify),
                onClick = { onAction(UiAction.OnVerifyClick) },
                modifier = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth),
                enabled = state.canVerify,
                loading = state.verifying || state.requesting,
            )
            ResendRow(state, onAction)
        }
    }
    if (state.dialog == OtpDialog.Expired) {
        AppDialog(
            title = stringResource(Res.string.otp_expired_title),
            message = stringResource(Res.string.otp_expired_body),
            confirmText = stringResource(Res.string.otp_expired_ok),
            onConfirm = { onAction(UiAction.OnDialogDismiss) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
        )
    }
}

@Composable
private fun ResendRow(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        when {
            state.isBlocked -> {
                AppText(text = stringResource(Res.string.otp_blocked), color = colors.danger, textAlign = TextAlign.Center)
                AppText(
                    text = stringResource(Res.string.otp_remaining, formatCountdown(state.blockedRemainingSeconds)),
                    color = colors.muted,
                    textAlign = TextAlign.Center,
                )
            }
            state.resendRemainingSeconds > 0 -> AppText(
                text = stringResource(Res.string.otp_resend_in, formatCountdown(state.resendRemainingSeconds)),
                color = colors.muted,
                textAlign = TextAlign.Center,
            )
            else -> AppTextButton(
                text = stringResource(Res.string.otp_resend),
                onClick = { onAction(UiAction.OnResendClick) },
                enabled = state.canResend,
            )
        }
    }
}
