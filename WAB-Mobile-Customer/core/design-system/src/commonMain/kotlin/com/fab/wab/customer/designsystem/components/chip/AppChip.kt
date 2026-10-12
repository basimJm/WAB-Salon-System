package com.fab.wab.customer.designsystem.components.chip

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
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush

/** Selectable filter chip. With [onRemove] it becomes an active-filter chip with a remove (x) action. */
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
    val shape = AppTheme.shapes.small
    val background = if (selected) Modifier.brandBackground(brandBrush(), shape) else Modifier.clip(shape).background(colors.soft)
    val content = if (selected) colors.onGradient else colors.accent
    Row(
        modifier = modifier
            .defaultMinSize(minHeight = AppTheme.sizes.chipHeight)
            .then(background)
            .semantics { this.selected = selected }
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = spacing.space12, vertical = spacing.space6),
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(text = text, style = AppTheme.typography.labelMedium, color = content, maxLines = 1)
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

/** Time slot in the booking grid: available, selected or full (disabled, with the caller's "full" label). */
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
    val background = if (selected) Modifier.brandBackground(brandBrush(), shape) else Modifier.clip(shape).background(colors.soft)
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
            .clickable(enabled = !full, role = Role.Button, onClick = onClick)
            .padding(horizontal = AppTheme.spacing.space12, vertical = AppTheme.spacing.space8),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val label = if (full && fullLabel != null) fullLabel else time
        AppText(text = label, style = AppTheme.typography.labelMedium, color = content, maxLines = 1)
    }
}
