package com.fab.wab.merchant.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.button.AppPrimaryButton
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.presentation.analytics.OtpAnalytics
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.OtpDialog
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiState
import com.fab.wab.merchant.feature.auth.presentation.resources.Res
import com.fab.wab.merchant.feature.auth.presentation.resources.auth_dialog_glyph_expired
import com.fab.wab.merchant.feature.auth.presentation.resources.login_dialog_cancel
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_expired_body
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_expired_title
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_resend
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_title
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_verify
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_wrong
import org.jetbrains.compose.resources.stringResource

/**
 * M03 as in `design/WAB Merchant 01 Onboarding.dc.html` (`on.otp`), code sent on WhatsApp (MER-070, MER-073):
 * `padding:54px 22px 30px` on the auth background, back pill + centered mode title, 76 dp soft icon box (per mode),
 * title 23, "we sent a code to <phone>", the bank note (bank details), N boxes from the backend, wrong-code line /
 * blocked banner, Verify, then resend link or countdown. The code field takes focus (keyboard up) whenever a live
 * code is waiting; the content keeps the phone width in landscape and on tablets.
 */
@Composable
fun OtpScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    TrackScreen(OtpAnalytics.SCREEN)
    val keyboard = LocalSoftwareKeyboardController.current
    val verify = {
        keyboard?.hide()
        onAction(UiAction.OnVerifyClick)
    }
    AppScreen(modifier = modifier) {
        AuthScrollColumn(
            contentPadding = authScreenPadding(AuthDesign.otpHorizontal, AuthDesign.otpBottom),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(modifier = Modifier.widthIn(max = AppTheme.sizes.sheetMaxWidth).fillMaxWidth()) {
                OtpHeader(title = stringResource(state.purpose.otpTitle()), onBack = onBack)
                OtpIntro(state)
                if (state.requestError != null) {
                    AppErrorState(onRetry = { onAction(UiAction.OnRetryRequest) }, message = state.requestError)
                } else {
                    OtpCodeSection(state, onAction, verify)
                }
            }
        }
    }
    if (state.dialog == OtpDialog.Expired) {
        AuthDialog(
            title = stringResource(Res.string.otp_expired_title),
            body = stringResource(Res.string.otp_expired_body),
            primaryText = stringResource(Res.string.otp_resend),
            onPrimary = {
                onAction(UiAction.OnDialogDismiss)
                onAction(UiAction.OnResendClick)
            },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
            secondaryText = stringResource(Res.string.login_dialog_cancel),
            glyph = stringResource(Res.string.auth_dialog_glyph_expired),
        )
    }
}

/** Icon box, title, "sent to", the code lifetime and the bank note. */
@Composable
private fun OtpIntro(state: UiState) {
    val colors = AppTheme.colors
    Column(modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .padding(top = AuthDesign.otpIconTop, bottom = AuthDesign.otpIconBottom)
                .size(AuthDesign.otpIconBox)
                .background(colors.soft, RoundedCornerShape(AuthDesign.otpIconBoxRadius)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(state.purpose.otpIcon(), contentDescription = null, tint = colors.accent, modifier = Modifier.size(AuthDesign.otpIcon))
        }
        AppText(
            text = stringResource(Res.string.otp_title),
            style = AppTheme.typography.headlineMedium.copy(
                fontSize = AuthDesign.otpTitleSize,
                lineHeight = AuthDesign.otpTitleLineHeight,
                fontWeight = FontWeight.Bold,
            ),
        )
        AuthGap(AuthDesign.otpTitleBottom)
        SentToLine(state.phoneDisplay)
        if (state.codeSent && state.expiresRemainingSeconds > 0) ExpiresLine(state.expiresRemainingSeconds)
        if (state.purpose == AuthPurpose.BANK_DETAILS) OtpBankNote()
    }
}

/** Boxes (focused while a live code waits), wrong-code line, blocked banner, Verify and the resend row. */
@Composable
private fun OtpCodeSection(state: UiState, onAction: (UiAction) -> Unit, onVerify: () -> Unit) {
    val colors = AppTheme.colors
    Column(modifier = Modifier.fillMaxWidth()) {
        if (state.otpLength > 0) OtpCodeField(state, onAction, onVerify)
        if (state.codeError) {
            AppText(
                text = state.codeErrorMessage ?: stringResource(Res.string.otp_wrong),
                style = AppTheme.typography.bodySmall.copy(fontSize = AuthDesign.otpWrongSize),
                color = colors.danger,
            )
        }
        if (state.isBlocked) OtpBlockedBanner(state.blockedRemainingSeconds)
        AuthGap(AuthDesign.otpButtonTop)
        AppPrimaryButton(
            text = stringResource(Res.string.otp_verify),
            onClick = onVerify,
            modifier = Modifier.fillMaxWidth(),
            enabled = state.canVerify,
            loading = state.verifying || state.requesting,
        )
        ResendRow(state, onAction, Modifier.padding(top = AuthDesign.otpResendTop))
    }
}

/** The code boxes; a new code, or a refused one (the keyboard was hidden on Verify), gives them the keyboard again. */
@Composable
private fun OtpCodeField(state: UiState, onAction: (UiAction) -> Unit, onVerify: () -> Unit) {
    val focusRequester = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current
    val awaitingCode = state.codeSent && !state.isBlocked
    LaunchedEffect(awaitingCode, state.codeError, state.codesSent) {
        if (awaitingCode) {
            focusRequester.requestFocus()
            keyboard?.show()
        }
    }
    OtpBoxes(
        value = state.code,
        onValueChange = { onAction(UiAction.OnCodeChange(it)) },
        length = state.otpLength,
        focusRequester = focusRequester,
        onSubmit = { if (state.canVerify) onVerify() },
        modifier = Modifier.padding(top = AuthDesign.otpBoxTop, bottom = AuthDesign.otpBoxBottom),
        error = state.codeError,
        blocked = state.isBlocked,
        enabled = !state.isBlocked && !state.verifying,
    )
}
