package com.fab.wab.merchant.designsystem.components.chip

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.components.surface.cardBackground
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.SurfaceTone
import com.fab.wab.merchant.designsystem.utils.brandBackground
import com.fab.wab.merchant.designsystem.utils.brandBrush

/**
 * Selectable filter chip (design `chipS`): 36 dp, radius 11, `padding:0 13px`, 12.5/600; selected = `var(--soft)`
 * fill, 1.5 dp `#A855F7` border and accent text, otherwise `var(--card)` with the line border and ink text.
 * With [onRemove] it becomes an active-filter chip with a remove (x) action.
 */
@Composable
fun AppFilterChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    removeDescription: String? = null,
    onRemove: (() -> Unit)? = null,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = AppTheme.shapes.chip
    val background = if (selected) {
        Modifier.cardBackground(AppTheme.surfaces, shape, SurfaceTone.Soft, stateBorder = colors.gradientEnd)
    } else {
        Modifier.cardBackground(AppTheme.surfaces, shape, stateBorder = colors.line)
    }
    val content = if (selected) colors.accent else colors.ink
    Row(
        modifier = modifier
            .defaultMinSize(minHeight = AppTheme.sizes.chipHeight)
            .then(background)
            .semantics { this.selected = selected }
            .clip(shape)
            .appClickable(onClick = onClick)
            .padding(horizontal = AppChipDesign.horizontalPadding, vertical = spacing.space6),
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(
            text = text,
            style = AppTheme.typography.labelMedium.copy(fontSize = AppChipDesign.labelSize, fontWeight = FontWeight.SemiBold),
            color = content,
            maxLines = 1,
        )
        if (onRemove != null) {
            Icon(
                imageVector = AppIcons.Close,
                contentDescription = removeDescription,
                tint = content,
                modifier = Modifier
                    .size(AppTheme.sizes.iconSmall)
                    .clickable(role = Role.Button, onClick = onRemove),
            )
        }
    }
}

enum class SlotState { Available, Selected, Full }

/** Time slot in the orders grid: available, selected or full (disabled, with the caller's "full" label). */
@Composable
fun AppTimeSlotChip(
    time: String,
    state: SlotState,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fullLabel: String? = null,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.small
    val selected = state == SlotState.Selected
    val full = state == SlotState.Full
    val background = if (selected) {
        Modifier.brandBackground(brandBrush(), shape)
    } else {
        Modifier.cardBackground(AppTheme.surfaces, shape, SurfaceTone.Surface)
    }
    val content = when {
        selected -> colors.onGradient
        full -> colors.faint
        else -> colors.accent
    }
    Row(
        modifier = modifier
            .defaultMinSize(minWidth = AppTheme.sizes.timeSlotWidth, minHeight = AppTheme.sizes.touchTarget)
            .then(background)
            .alpha(if (full) AppTheme.alpha.disabled else 1f)
            .semantics { this.selected = selected }
            .appClickable(enabled = !full, onClick = onClick)
            .padding(horizontal = AppTheme.spacing.space12, vertical = AppTheme.spacing.space8),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val label = if (full && fullLabel != null) fullLabel else time
        AppText(text = label, style = AppTheme.typography.labelMedium, color = content, maxLines = 1)
    }
}
