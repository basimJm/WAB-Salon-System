package com.fab.wab.customer.feature.salon.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme

/** Visual weight of the design's secondary buttons: `border 1.5px line + card` or `soft + accent`. */
internal enum class SalonButtonKind { Outlined, Soft }

/**
 * Design buttons of 03 Salon that the shared [com.fab.wab.customer.designsystem.components.button.AppButton] cannot draw:
 * fixed height 46/48, ink text on the outlined kind, `13.5–14px / 600`, optional leading icon with its own tint.
 */
@Composable
internal fun SalonButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    kind: SalonButtonKind = SalonButtonKind.Outlined,
    height: Dp = SalonDesign.actionButtonHeight,
    leadingIcon: ImageVector? = null,
    iconTint: Color = AppTheme.colors.ink,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val container = when (kind) {
        SalonButtonKind.Outlined -> Modifier.border(AppTheme.sizes.borderWidth, colors.line, shape).clip(shape).background(colors.card)
        SalonButtonKind.Soft -> Modifier.clip(shape).background(colors.soft)
    }
    val content = if (kind == SalonButtonKind.Outlined) colors.ink else colors.accent
    Row(
        modifier = modifier
            .height(height)
            .then(container)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = AppTheme.spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingIcon != null) {
            Icon(leadingIcon, contentDescription = null, tint = iconTint, modifier = Modifier.size(SalonDesign.contactIcon))
        }
        AppText(text = text, style = AppTheme.typography.titleSmall, color = content, maxLines = 1, textAlign = TextAlign.Center)
    }
}

/** `badge()` of the design with the 6 px dot: `11.5px/700`, padding `4 10`, radius 8, tinted container. */
@Composable
internal fun SalonStatusBadge(text: String, positive: Boolean, modifier: Modifier = Modifier, withDot: Boolean = true) {
    val colors = AppTheme.colors
    val content = if (positive) colors.onSuccessContainer else colors.onDangerContainer
    val container = if (positive) colors.successContainer else colors.dangerContainer
    Row(
        modifier = modifier
            .background(container, AppTheme.shapes.small)
            .padding(horizontal = AppTheme.spacing.space10, vertical = AppTheme.spacing.space4),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (withDot) Box(Modifier.size(SalonDesign.statusDot).background(content, AppTheme.shapes.circle))
        AppText(text = text, style = AppTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = content, maxLines = 1)
    }
}

/**
 * Universal state as drawn on S07 (error) and S08 (empty / error): a tinted circle with the icon, a bold title,
 * an optional muted body and an optional gradient action.
 */
@Composable
internal fun SalonStatePlaceholder(
    icon: ImageVector,
    title: String,
    modifier: Modifier = Modifier,
    message: String? = null,
    actionText: String? = null,
    onAction: (() -> Unit)? = null,
    circleSize: Dp = SalonDesign.stateCircle,
    iconSize: Dp = SalonDesign.stateIcon,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Column(
        modifier = modifier.fillMaxSize().padding(horizontal = SalonDesign.statePadding, vertical = SalonDesign.bookBarBottom),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier.size(circleSize).background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = colors.accent, modifier = Modifier.size(iconSize))
        }
        AppText(
            text = title,
            style = AppTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = spacing.space20, bottom = spacing.space8),
        )
        if (message != null) {
            AppText(text = message, style = AppTheme.typography.bodyMedium, color = colors.muted, textAlign = TextAlign.Center)
        }
        if (actionText != null && onAction != null) {
            AppPrimaryButton(text = actionText, onClick = onAction, modifier = Modifier.padding(top = spacing.space20))
        }
    }
}
