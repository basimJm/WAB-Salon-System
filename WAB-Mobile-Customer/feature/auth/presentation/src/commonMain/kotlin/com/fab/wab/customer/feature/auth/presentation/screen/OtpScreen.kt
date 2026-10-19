package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Smartphone
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import com.fab.wab.customer.core.analytics.compose.TrackScreen
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.layout.AppScreen
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.presentation.analytics.OtpAnalytics
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.OtpDialog
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract.UiState
import com.fab.wab.customer.feature.auth.presentation.controller.contract.formatCountdown
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.auth_dialog_glyph_expired
import com.fab.wab.customer.feature.auth.presentation.resources.login_dialog_cancel
import com.fab.wab.customer.feature.auth.presentation.resources.otp_expired_body
import com.fab.wab.customer.feature.auth.presentation.resources.otp_expired_title
import com.fab.wab.customer.feature.auth.presentation.resources.otp_resend
import com.fab.wab.customer.feature.auth.presentation.resources.otp_resend_in
import com.fab.wab.customer.feature.auth.presentation.resources.otp_sent_to
import com.fab.wab.customer.feature.auth.presentation.resources.otp_title
import com.fab.wab.customer.feature.auth.presentation.resources.otp_title_booking
import com.fab.wab.customer.feature.auth.presentation.resources.otp_verify
import com.fab.wab.customer.feature.auth.presentation.resources.otp_wrong
import org.jetbrains.compose.resources.stringResource

/**
 * S13 as in `design/WAB 01 Auth.dc.html` (`on.otp`): hero gradient, `padding:54px 24px 30px`, back pill with the
 * centered "Confirm booking" header (booking variant only), 76 dp soft icon box, title 23, "we sent a code to
 * <phone>", N boxes from the backend, wrong-code line / blocked banner, Verify, then resend link or countdown.
 */
@Composable
fun OtpScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    TrackScreen(OtpAnalytics.SCREEN)
    val colors = AppTheme.colors
    AppScreen(modifier = modifier) {
        AuthScrollColumn(contentPadding = authScreenPadding(AuthDesign.otpHorizontal, AuthDesign.otpBottom)) {
            OtpHeader(state.purpose, onBack)
            Box(
                modifier = Modifier
                    .padding(top = AuthDesign.otpIconTop, bottom = AuthDesign.otpIconBottom)
                    .size(AuthDesign.otpIconBox)
                    .background(colors.soft, RoundedCornerShape(AuthDesign.otpIconBoxRadius)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Rounded.Smartphone,
                    contentDescription = null,
                    tint = colors.accent,
                    modifier = Modifier.size(AuthDesign.otpIcon),
                )
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
            if (state.requestError != null) {
                AppErrorState(onRetry = { onAction(UiAction.OnRetryRequest) }, message = state.requestError)
                return@AuthScrollColumn
            }
            if (state.otpLength > 0) {
                OtpBoxes(
                    value = state.code,
                    onValueChange = { onAction(UiAction.OnCodeChange(it)) },
                    length = state.otpLength,
                    modifier = Modifier.padding(top = AuthDesign.otpBoxTop, bottom = AuthDesign.otpBoxBottom),
                    error = state.codeError,
                    blocked = state.isBlocked,
                    enabled = !state.isBlocked && !state.verifying,
                )
            }
            if (state.codeError) {
                AppText(
                    text = stringResource(Res.string.otp_wrong),
                    style = AppTheme.typography.bodySmall.copy(fontSize = AuthDesign.otpWrongSize),
                    color = colors.danger,
                )
            }
            if (state.isBlocked) OtpBlockedBanner(state.blockedRemainingSeconds)
            AuthGap(AuthDesign.otpButtonTop)
            AppPrimaryButton(
                text = stringResource(Res.string.otp_verify),
                onClick = { onAction(UiAction.OnVerifyClick) },
                modifier = Modifier.fillMaxWidth(),
                enabled = state.canVerify,
                loading = state.verifying || state.requesting,
            )
            ResendRow(state, onAction, Modifier.padding(top = AuthDesign.otpResendTop))
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

/** Back pill at the start; the booking variant centers "Confirm booking" (15/600) over the full row. */
@Composable
private fun OtpHeader(purpose: AuthPurpose, onBack: (() -> Unit)?, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxWidth().defaultMinSize(minHeight = AuthDesign.topRowMinHeight)) {
        if (onBack != null) AuthBackPill(onBack, Modifier.align(Alignment.CenterStart))
        if (purpose == AuthPurpose.BOOKING_CONFIRMATION) {
            AppText(
                text = stringResource(Res.string.otp_title_booking),
                modifier = Modifier.align(Alignment.Center),
                style = AppTheme.typography.labelLarge.copy(fontSize = AuthDesign.otpHeaderSize),
            )
        }
    }
}

/** "We sent a code to" in muted 13.5 + the number in ink/600, isolated LTR (`unicode-bidi:isolate`). */
@Composable
private fun SentToLine(phone: String, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val prefix = stringResource(Res.string.otp_sent_to)
    val text = buildAnnotatedString {
        append(prefix)
        append(' ')
        withStyle(SpanStyle(color = colors.ink, fontWeight = FontWeight.SemiBold)) { append(isolateLtr(phone)) }
    }
    AppText(
        text = text,
        modifier = modifier,
        style = AppTheme.typography.bodyMedium.copy(fontSize = AuthDesign.otpSentSize, lineHeight = AuthDesign.otpSentLineHeight),
        color = colors.muted,
    )
}

/** Wraps a phone number in LTR isolates so it never reorders inside Arabic text. */
private fun isolateLtr(value: String): String = "$LTR_ISOLATE$value$POP_ISOLATE"

private const val LTR_ISOLATE = '⁦'
private const val POP_ISOLATE = '⁩'

@Composable
private fun ResendRow(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
        when {
            state.isBlocked -> Unit
            state.resendRemainingSeconds > 0 -> {
                val countdown = buildAnnotatedString {
                    append(stringResource(Res.string.otp_resend_in))
                    append(' ')
                    withStyle(SpanStyle(color = colors.ink, fontWeight = FontWeight.Bold)) {
                        append(isolateLtr(formatCountdown(state.resendRemainingSeconds)))
                    }
                }
                AppText(
                    text = countdown,
                    modifier = Modifier.padding(AuthDesign.otpResendPadding),
                    style = AppTheme.typography.bodyMedium.copy(fontSize = AuthDesign.otpCountingSize),
                    color = colors.muted,
                )
            }
            else -> AppText(
                text = stringResource(Res.string.otp_resend),
                modifier = Modifier
                    .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
                    .clip(AppTheme.shapes.small)
                    .clickable(enabled = state.canResend, role = Role.Button) { onAction(UiAction.OnResendClick) }
                    .padding(AuthDesign.otpResendPadding),
                style = AppTheme.typography.labelLarge.copy(fontSize = AuthDesign.otpResendSize, fontWeight = FontWeight.Bold),
                color = colors.accent,
            )
        }
    }
}
