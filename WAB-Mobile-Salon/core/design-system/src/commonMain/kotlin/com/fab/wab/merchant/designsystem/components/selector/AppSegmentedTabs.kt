package com.fab.wab.merchant.designsystem.components.selector

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.merchant.designsystem.components.surface.appClickable
import com.fab.wab.merchant.designsystem.components.surface.cardBackground
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.SurfaceTone
import com.fab.wab.merchant.designsystem.utils.brandBackground
import com.fab.wab.merchant.designsystem.utils.brandBrush

/** Two to five equal tabs in a soft track (segment tabs, upcoming/past orders). Order follows the layout direction. */
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
            // Design `fTabs`: `padding:4px;gap:4px;border-radius:14px;background:var(--surface)`.
            .cardBackground(AppTheme.surfaces, shape, SurfaceTone.Surface)
            .padding(spacing.space4),
        horizontalArrangement = Arrangement.spacedBy(spacing.space4),
    ) {
        tabs.forEachIndexed { index, label ->
            val selected = index == selectedIndex
            // Design `segS`: 38 dp, radius 11, gradient when selected, transparent + muted otherwise, 12.5/600.
            val tabShape = AppTheme.shapes.chip
            Box(
                modifier = Modifier
                    .weight(1f)
                    .defaultMinSize(minHeight = AppTheme.sizes.touchTarget - spacing.space8)
                    .clip(tabShape)
                    .then(if (selected) Modifier.brandBackground(brandBrush(), tabShape) else Modifier)
                    .semantics { this.selected = selected }
                    .appClickable(role = Role.Tab) { onSelect(index) }
                    .padding(vertical = spacing.space8),
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = label,
                    style = AppTheme.typography.labelMedium.copy(fontSize = SegmentedDesign.labelSize, fontWeight = FontWeight.SemiBold),
                    color = if (selected) colors.onGradient else colors.muted,
                    maxLines = 1,
                )
            }
        }
    }
}
