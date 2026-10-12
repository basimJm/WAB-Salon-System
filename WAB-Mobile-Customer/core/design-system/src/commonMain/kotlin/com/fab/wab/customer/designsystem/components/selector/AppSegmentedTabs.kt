package com.fab.wab.customer.designsystem.components.selector

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush

/** Two to four equal tabs in a soft track (gender tabs, upcoming/past bookings). Order follows the layout direction. */
@Composable
fun AppSegmentedTabs(
    tabs: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val shape = AppTheme.shapes.medium
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(colors.soft)
            .padding(spacing.space4),
    ) {
        tabs.forEachIndexed { index, label ->
            val selected = index == selectedIndex
            val tabShape = AppTheme.shapes.small
            Box(
                modifier = Modifier
                    .weight(1f)
                    .defaultMinSize(minHeight = AppTheme.sizes.touchTarget - spacing.space8)
                    .then(if (selected) Modifier.brandBackground(brandBrush(), tabShape) else Modifier)
                    .semantics { this.selected = selected }
                    .clickable(role = Role.Tab) { onSelect(index) }
                    .padding(vertical = spacing.space8),
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = label,
                    style = AppTheme.typography.labelLarge,
                    color = if (selected) colors.onGradient else colors.accent,
                    maxLines = 1,
                )
            }
        }
    }
}
