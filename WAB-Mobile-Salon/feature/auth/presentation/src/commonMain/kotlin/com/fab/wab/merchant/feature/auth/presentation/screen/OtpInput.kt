package com.fab.wab.merchant.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.sanitizeOtp
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res as CoreRes
import com.fab.wab.merchant.designsystem.resources.otp_description
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.formatCountdown
import com.fab.wab.merchant.feature.auth.presentation.resources.Res
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_blocked
import com.fab.wab.merchant.feature.auth.presentation.resources.otp_remaining
import org.jetbrains.compose.resources.stringResource

/**
 * The merchant design's OTP boxes (`WAB Merchant 01 Onboarding.dc.html`, `otpBoxes`): equal columns (gap 8) of 56 dp
 * flat card cells, radius 14, 22/700 digit, 1.5 dp border danger / violet on the current cell (+ a 4 dp focus ring
 * at 12 % drawn outside the cell) / light violet when filled / line, 50 % opacity when blocked. Digits run left to
 * right in both languages. [length] comes from the backend.
 *
 * One hidden field takes the keyboard, the paste of the WhatsApp code and autofill ([ContentType.SmsOtpCode]);
 * the keyboard's Done key verifies ([onSubmit]).
 */
@Composable
internal fun OtpBoxes(
    value: String,
    onValueChange: (String) -> Unit,
    length: Int,
    focusRequester: FocusRequester,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
    error: Boolean = false,
    blocked: Boolean = false,
    enabled: Boolean = true,
) {
    val colors = AppTheme.colors
    val description = stringResource(CoreRes.string.otp_description, value.length, length)
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        BasicTextField(
            value = value,
            onValueChange = { onValueChange(sanitizeOtp(it, length, previous = value, restart = error)) },
            modifier = modifier
                .fillMaxWidth()
                .focusRequester(focusRequester)
                .semantics {
                    contentDescription = description
                    contentType = ContentType.SmsOtpCode
                },
            enabled = enabled,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            cursorBrush = SolidColor(colors.accent),
            decorationBox = { inner ->
                Box {
                    // The real field stays composed (focus, keyboard, paste) but invisible; the boxes draw its text.
                    Box(Modifier.alpha(0f)) { inner() }
                    Row(
                        modifier = Modifier.fillMaxWidth().alpha(if (blocked) AuthDesign.otpBlockedAlpha else 1f),
                        horizontalArrangement = Arrangement.spacedBy(AuthDesign.otpBoxGap),
                    ) {
                        repeat(length) { index ->
                            OtpCell(
                                digit = value.getOrNull(index)?.toString().orEmpty(),
                                current = index == value.length && !blocked,
                                filled = index < value.length,
                                error = error,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            },
        )
    }
}

@Composable
private fun OtpCell(digit: String, current: Boolean, filled: Boolean, error: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(AuthDesign.otpBoxRadius)
    val borderColor = when {
        error -> colors.danger
        current -> colors.gradientEnd
        // Design `#D8B4FE` = the gradient's light violet, softened.
        filled -> colors.gradientEnd.copy(alpha = AppTheme.alpha.disabled)
        else -> colors.line
    }
    val ringColor = if (current && !error) colors.gradientEnd.copy(alpha = AuthDesign.otpFocusRingAlpha) else Color.Unspecified
    Box(
        modifier = modifier
            .height(AuthDesign.otpBoxHeight)
            .focusRing(ringColor)
            .background(colors.card, shape)
            .border(AppTheme.sizes.borderWidth, borderColor, shape),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = digit,
            style = AppTheme.typography.titleLarge.copy(fontSize = AuthDesign.otpDigitSize, fontWeight = FontWeight.Bold),
        )
    }
}

/** The design's `box-shadow:0 0 0 4px` ring: drawn outside the cell, so the current cell keeps the size of the others. */
private fun Modifier.focusRing(color: Color): Modifier = if (color == Color.Unspecified) {
    this
} else {
    drawBehind {
        val ring = AuthDesign.otpFocusRing.toPx()
        val radius = AuthDesign.otpBoxRadius.toPx() + ring
        drawRoundRect(
            color = color,
            topLeft = Offset(-ring, -ring),
            size = Size(size.width + ring + ring, size.height + ring + ring),
            cornerRadius = CornerRadius(radius, radius),
        )
    }
}

/**
 * `otpBlocked` banner: danger-tinted box (10 %), radius 14, `padding:12px 14px`, 18 dp clock, 12.5 px ink text and
 * the remaining time (`Time remaining 14:32`) in bold danger below it.
 */
@Composable
internal fun OtpBlockedBanner(remainingSeconds: Int, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = AuthDesign.otpBlockedTop)
            .clip(AppTheme.shapes.medium)
            .background(colors.danger.copy(alpha = AuthDesign.otpBlockedBgAlpha))
            .padding(vertical = AuthDesign.otpBlockedPaddingV, horizontal = AuthDesign.otpBlockedPaddingH),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(AppIcons.Clock, contentDescription = null, tint = colors.danger, modifier = Modifier.size(AuthDesign.otpBlockedIcon))
        Column {
            val style = AppTheme.typography.bodySmall.copy(
                fontSize = AuthDesign.otpBlockedTextSize,
                lineHeight = AuthDesign.otpBlockedLineHeight,
            )
            AppText(text = stringResource(Res.string.otp_blocked), style = style, color = colors.ink)
            AppText(
                text = stringResource(Res.string.otp_remaining, formatCountdown(remainingSeconds)),
                modifier = Modifier.padding(top = AppTheme.spacing.space2),
                style = style.copy(fontWeight = FontWeight.Bold, textDirection = TextDirection.Content),
                color = colors.danger,
            )
        }
    }
}
