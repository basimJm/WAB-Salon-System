package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush

/** Design `linear-gradient(135deg,#6D28D9,#A855F7)` button, 52 px, 15/600. */
@Composable
internal fun GradientButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = ProfileDesign.buttonHeight,
    textSize: TextUnit = ProfileDesign.buttonTextSize,
    enabled: Boolean = true,
) {
    Box(
        modifier = modifier
            .height(height)
            .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
            .brandBackground(brandBrush(), AppTheme.shapes.medium)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = AppTheme.spacing.space20),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(fontSize = textSize, fontWeight = FontWeight.SemiBold),
            color = AppTheme.colors.onGradient,
            textAlign = TextAlign.Center,
            maxLines = 1,
        )
    }
}

/** Design `border:1.5px solid var(--line);background:var(--card);color:var(--ink)` button, 52 px, 15/600. */
@Composable
internal fun OutlineButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    Box(
        modifier = modifier
            .height(ProfileDesign.buttonHeight)
            .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
            .clip(shape)
            .glassBackground(AppTheme.glass, shape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(fontSize = ProfileDesign.buttonTextSize, fontWeight = FontWeight.SemiBold),
            color = colors.ink,
            maxLines = 1,
        )
    }
}

/** Borderless text button with an explicit height (delete account, dialog cancel). */
@Composable
internal fun PlainTextButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = ProfileDesign.deleteHeight,
    textSize: TextUnit = ProfileDesign.deleteTextSize,
    color: Color = AppTheme.colors.danger,
    enabled: Boolean = true,
) {
    Box(
        modifier = modifier
            .height(height)
            .clip(AppTheme.shapes.medium)
            .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelLarge.copy(fontSize = textSize, fontWeight = FontWeight.SemiBold),
            color = color,
            maxLines = 1,
        )
    }
}

/** Sheet scaffold of the design: card background, 26 px top radius, `padding:10px 20px 34px`, centred bold title. */
@Composable
internal fun ProfileSheet(title: String, onDismiss: () -> Unit, content: @Composable () -> Unit) {
    AppBottomSheet(onDismiss = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = ProfileDesign.sheetHorizontal, end = ProfileDesign.sheetHorizontal, bottom = ProfileDesign.sheetBottom),
        ) {
            AppText(
                text = title,
                style = AppTheme.typography.titleMedium.copy(fontSize = ProfileDesign.sheetTitleSize, fontWeight = FontWeight.Bold),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(bottom = ProfileDesign.sheetTitleBottom),
            )
            content()
        }
    }
}

/** Sheet option (`min-height:54px;padding:0 4px;gap:12px`): 36 px icon box, label (bold when selected), check mark. */
@Composable
internal fun OptionRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    danger: Boolean = false,
    divider: Boolean = true,
) {
    val colors = AppTheme.colors
    val boxBackground = if (danger) colors.danger.copy(alpha = ProfileDesign.optionDangerAlpha) else colors.soft
    val tint = if (danger) colors.danger else colors.accent
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = ProfileDesign.rowMinHeight)
                .clickable(role = Role.Button, onClick = onClick)
                .padding(horizontal = ProfileDesign.optionHorizontal),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(ProfileDesign.optionIconBox)
                    .background(boxBackground, RoundedCornerShape(ProfileDesign.rowIconBoxRadius)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(ProfileDesign.optionIcon))
            }
            AppText(
                text = label,
                style = AppTheme.typography.bodyMedium.copy(
                    fontSize = ProfileDesign.optionTextSize,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                ),
                color = if (danger) colors.danger else colors.ink,
                modifier = Modifier.weight(1f),
            )
            if (selected) {
                Icon(AppIcons.Check, contentDescription = null, tint = colors.accent, modifier = Modifier.size(ProfileDesign.optionCheck))
            }
        }
        if (divider) Box(Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(colors.line))
    }
}
