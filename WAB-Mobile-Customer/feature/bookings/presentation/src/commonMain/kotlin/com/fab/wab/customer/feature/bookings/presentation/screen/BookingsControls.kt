package com.fab.wab.customer.feature.bookings.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush

/**
 * Design S14 search: `height:48px;padding:0 14px;border-radius:14px;border:1.5px solid var(--line);background:var(--card)`,
 * 18 px faint search icon, 14 px text. `AppSearchBar` is 52 px tall with 16 px text, so the field is drawn here.
 */
@Composable
internal fun BookingsSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val textStyle = AppTheme.typography.bodyMedium
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        textStyle = textStyle.copy(color = colors.ink),
        singleLine = true,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        cursorBrush = SolidColor(colors.accent),
        decorationBox = { inner ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(AppTheme.sizes.touchTarget)
                    .glassBackground(AppTheme.glass, shape)
                    .padding(horizontal = AppTheme.spacing.space14),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10),
            ) {
                Icon(
                    imageVector = AppIcons.Search,
                    contentDescription = null,
                    tint = colors.faint,
                    modifier = Modifier.size(BookingsDesign.searchIcon),
                )
                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                    if (value.isEmpty()) AppText(text = placeholder, style = textStyle, color = colors.faint, maxLines = 1)
                    inner()
                }
            }
        },
    )
}

/**
 * Design S14 tabs: `grid 1fr 1fr;gap:6px;padding:5px;border-radius:16px;background:var(--surface)`; each tab 40 px,
 * radius 12, gradient + white when selected, muted 14 px 600 otherwise. `AppSegmentedTabs` uses the soft surface
 * and accent text for the unselected tab, so the control is drawn here.
 */
@Composable
internal fun BookingsSegmentedTabs(
    tabs: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.surface, AppTheme.shapes.large)
            .padding(BookingsDesign.tabsPadding),
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
    ) {
        tabs.forEachIndexed { index, label ->
            val selected = index == selectedIndex
            val tabShape = RoundedCornerShape(BookingsDesign.tabRadius)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(AppTheme.sizes.buttonHeightCompact)
                    .then(if (selected) Modifier.brandBackground(brandBrush(), tabShape) else Modifier)
                    .semantics { this.selected = selected }
                    .clickable(role = Role.Tab) { onSelect(index) },
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = label,
                    style = AppTheme.typography.titleSmall,
                    color = if (selected) colors.onGradient else colors.muted,
                    maxLines = 1,
                )
            }
        }
    }
}
