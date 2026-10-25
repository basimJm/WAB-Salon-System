package com.fab.wab.merchant.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.utils.brandBackground
import com.fab.wab.merchant.designsystem.utils.brandBrush
import com.fab.wab.merchant.designsystem.utils.softShadow

/** Tone of the 56 dp icon circle: soft/accent (default) or danger-tinted (`blocked`). */
internal enum class AuthDialogTone { Accent, Danger }

/**
 * The auth popups (`dlg`): card radius 24, `padding:26px 22px 20px`, centered 56 dp icon circle, title 17/700,
 * body 13.5 muted, gradient primary 50 dp (14.5/600) and a muted text secondary 46 dp (14/600).
 * `AppDialog` uses radius 22, a 24 dp icon and an outlined secondary, so this stays private here. Candidate for the
 * design system. The icon is a glyph (`!`, `⛔`, `⏱`, `↻` in the design) or a vector.
 */
@Composable
internal fun AuthDialog(
    title: String,
    body: String,
    primaryText: String,
    onPrimary: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    secondaryText: String? = null,
    icon: ImageVector? = null,
    glyph: String? = null,
    tone: AuthDialogTone = AuthDialogTone.Accent,
) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(AuthDesign.cardRadius)
    val iconColor = if (tone == AuthDialogTone.Danger) colors.danger else colors.accent
    val iconBackground = if (tone == AuthDialogTone.Danger) colors.danger.copy(alpha = AuthDesign.dialogDangerBgAlpha) else colors.soft
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            modifier = modifier
                .padding(AuthDesign.dialogOuterPadding)
                .widthIn(max = AppTheme.sizes.dialogMaxWidth)
                .fillMaxWidth()
                .softShadow(AppTheme.elevation.overlay, colors.shadow.copy(alpha = AppTheme.alpha.overlayScrim), shape)
                .clip(shape)
                .background(colors.card)
                .padding(
                    top = AuthDesign.dialogPaddingTop,
                    start = AuthDesign.dialogPaddingHorizontal,
                    end = AuthDesign.dialogPaddingHorizontal,
                    bottom = AuthDesign.dialogPaddingBottom,
                ),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier.size(AppTheme.sizes.dialogIcon).background(iconBackground, AppTheme.shapes.circle),
                contentAlignment = Alignment.Center,
            ) {
                when {
                    icon != null -> Icon(
                        icon,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(AppTheme.sizes.iconLarge),
                    )
                    glyph != null -> AppText(
                        text = glyph,
                        style = AppTheme.typography.titleLarge.copy(fontSize = AuthDesign.dialogIconTextSize),
                        color = iconColor,
                    )
                }
            }
            AuthGap(AuthDesign.dialogIconBottom)
            AppText(
                text = title,
                style = AppTheme.typography.titleLarge.copy(fontSize = AuthDesign.dialogTitleSize, fontWeight = FontWeight.Bold),
                textAlign = TextAlign.Center,
            )
            AuthGap(AuthDesign.dialogTitleBottom)
            AppText(
                text = body,
                style = AppTheme.typography.bodyMedium.copy(
                    fontSize = AuthDesign.dialogBodySize,
                    lineHeight = AuthDesign.dialogBodyLineHeight,
                ),
                color = colors.muted,
                textAlign = TextAlign.Center,
            )
            AuthGap(AuthDesign.dialogBodyBottom)
            Column(verticalArrangement = Arrangement.spacedBy(AuthDesign.dialogButtonGap)) {
                DialogPrimaryButton(primaryText, onPrimary)
                if (secondaryText != null) DialogSecondaryButton(secondaryText, onDismiss)
            }
        }
    }
}

@Composable
private fun DialogPrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = AppTheme.shapes.medium
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(AuthDesign.dialogPrimaryHeight)
            .brandBackground(brandBrush(), shape)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(fontSize = AuthDesign.dialogPrimarySize),
            color = AppTheme.colors.onGradient,
            maxLines = 1,
        )
    }
}

@Composable
private fun DialogSecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = AppTheme.sizes.touchTarget)
            .clip(AppTheme.shapes.medium)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(fontSize = AuthDesign.dialogSecondarySize),
            color = AppTheme.colors.muted,
            maxLines = 1,
        )
    }
}
