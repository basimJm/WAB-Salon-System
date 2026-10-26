package com.fab.wab.merchant.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import com.fab.wab.merchant.designsystem.components.format.ltrIsolate
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiAction
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract.UiState
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.formatCountdown
import com.fab.wab.merchant.feature.auth.presentation.resources.Res
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_bank_note
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_expires_in
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_mode_bank_details
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_mode_change_phone
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_mode_login
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_mode_register
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_resend
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_resend_in
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_sent_to
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Header title per mode (design `t.modes`). */
internal fun AuthPurpose.otpTitle(): StringResource = when (this) {
    AuthPurpose.LOGIN -> Res.string.otp_mode_login
    AuthPurpose.REGISTER -> Res.string.otp_mode_register
    AuthPurpose.CHANGE_PHONE -> Res.string.otp_mode_change_phone
    AuthPurpose.BANK_DETAILS -> Res.string.otp_mode_bank_details
}

/** Icon in the soft box per mode (design `OTPI`: phone, house, phone, bank). */
internal fun AuthPurpose.otpIcon(): ImageVector = when (this) {
    AuthPurpose.LOGIN, AuthPurpose.CHANGE_PHONE -> AppIcons.Device
    AuthPurpose.REGISTER -> AppIcons.House
    AuthPurpose.BANK_DETAILS -> AppIcons.Bank
}

/** Back pill at the start and the mode title centered over the row (`otpHeader`, 15/600). */
@Composable
internal fun OtpHeader(title: String, onBack: (() -> Unit)?, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxWidth().defaultMinSize(minHeight = AuthDesign.topRowMinHeight),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = title,
            modifier = Modifier
                .padding(horizontal = AppTheme.sizes.touchTarget)
                .semantics { heading() },
            style = AppTheme.typography.titleMedium.copy(fontSize = AuthDesign.otpHeaderSize, fontWeight = FontWeight.SemiBold),
            textAlign = TextAlign.Center,
        )
        if (onBack != null) AuthBackPill(onBack, Modifier.align(Alignment.CenterStart))
    }
}

/** "We sent a code to" in muted 13.5 + the number in ink/600, isolated LTR (`unicode-bidi:isolate`). */
@Composable
internal fun SentToLine(phone: String, modifier: Modifier = Modifier) {
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

/** "The code expires in 4:59" under the number: the WhatsApp code lives `expiresInSeconds` (BUSINESS_DOMAIN §3.1a). */
@Composable
internal fun ExpiresLine(remainingSeconds: Int, modifier: Modifier = Modifier) {
    AppText(
        text = stringResource(Res.string.otp_expires_in, isolateLtr(formatCountdown(remainingSeconds))),
        modifier = modifier,
        style = AppTheme.typography.bodySmall.copy(fontSize = AuthDesign.otpExpiresSize),
        color = AppTheme.colors.muted,
    )
}

/** BANK_DETAILS only: the soft accent note under the number (`bankNote`). */
@Composable
internal fun OtpBankNote(modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    AppText(
        text = stringResource(Res.string.otp_bank_note),
        modifier = modifier
            .padding(top = AuthDesign.otpNoteTop)
            .fillMaxWidth()
            .background(colors.soft, RoundedCornerShape(AuthDesign.otpNoteRadius))
            .padding(vertical = AuthDesign.otpNotePaddingV, horizontal = AuthDesign.otpNotePaddingH),
        style = AppTheme.typography.bodySmall.copy(fontSize = AuthDesign.otpNoteSize, lineHeight = AuthDesign.otpNoteLineHeight),
        color = colors.accent,
    )
}

/** Wraps a phone number or a time in LTR isolates so it never reorders inside Arabic text. */
internal fun isolateLtr(value: String): String = ltrIsolate(value)

/** Resend link once the countdown ends, "Resend in 0:45" (time bold ink) while it runs, nothing while blocked. */
@Composable
internal fun ResendRow(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
        when {
            state.isBlocked -> Unit
            state.resendRemainingSeconds > 0 -> {
                // The string carries the time as %1$s; the time part is bolded where it lands in either language.
                val time = isolateLtr(formatCountdown(state.resendRemainingSeconds))
                val sentence = stringResource(Res.string.otp_resend_in, time)
                val start = sentence.indexOf(time)
                val countdown = buildAnnotatedString {
                    append(sentence)
                    if (start >= 0) {
                        addStyle(SpanStyle(color = colors.ink, fontWeight = FontWeight.Bold), start, start + time.length)
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
