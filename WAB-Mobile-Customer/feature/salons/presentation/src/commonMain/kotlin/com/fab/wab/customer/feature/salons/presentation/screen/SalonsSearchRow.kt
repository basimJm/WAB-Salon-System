package com.fab.wab.customer.feature.salons.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import com.fab.wab.customer.designsystem.components.chip.ActiveFilterChip
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.feature.home.presentation.screen.DiscoveryDesign
import com.fab.wab.customer.feature.home.presentation.screen.discoveryBody
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.salons_chip_remove
import com.fab.wab.customer.feature.salons.presentation.resources.salons_filter
import com.fab.wab.customer.feature.salons.presentation.resources.salons_search_hint
import org.jetbrains.compose.resources.stringResource

/** Design S04 search row: 50 dp bordered card field at Start, 50 dp gradient filter button with the chip-count badge. */
@Composable
internal fun SalonsSearchRow(
    value: String,
    onValueChange: (String) -> Unit,
    onSearch: () -> Unit,
    chipCount: Int,
    onFilterClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = spacing.space20, end = spacing.space20, top = SalonsDesign.SEARCH_ROW_PADDING_TOP, bottom = spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SearchField(value, onValueChange, onSearch, Modifier.weight(1f))
        FilterButton(chipCount, onFilterClick)
    }
}

@Composable
private fun SearchField(value: String, onValueChange: (String) -> Unit, onSearch: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val textStyle = discoveryBody(DiscoveryDesign.TEXT_14).copy(color = colors.ink)
    Row(
        modifier = modifier
            .height(SalonsDesign.SEARCH_FIELD_HEIGHT)
            .clip(shape)
            .glassBackground(AppTheme.glass, shape)
            .padding(horizontal = AppTheme.spacing.space14),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(AppIcons.Search, contentDescription = null, tint = colors.faint, modifier = Modifier.size(SalonsDesign.SEARCH_ICON))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.weight(1f),
            textStyle = textStyle,
            singleLine = true,
            cursorBrush = SolidColor(colors.accent),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { onSearch() }),
            decorationBox = { inner ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (value.isEmpty()) {
                        AppText(text = stringResource(Res.string.salons_search_hint), style = textStyle, color = colors.faint, maxLines = 1)
                    }
                    inner()
                }
            },
        )
    }
}

@Composable
private fun FilterButton(chipCount: Int, onClick: () -> Unit) {
    val colors = AppTheme.colors
    Box {
        Box(
            modifier = Modifier
                .size(SalonsDesign.FILTER_BUTTON)
                .brandBackground(brandBrush(), AppTheme.shapes.medium)
                .clickable(role = Role.Button, onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = AppIcons.Filter,
                contentDescription = stringResource(Res.string.salons_filter),
                tint = colors.onGradient,
                modifier = Modifier.size(SalonsDesign.FILTER_ICON),
            )
        }
        if (chipCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = SalonsDesign.FILTER_BADGE_OFFSET, y = -SalonsDesign.FILTER_BADGE_OFFSET)
                    .size(SalonsDesign.FILTER_BADGE)
                    .background(colors.background, AppTheme.shapes.circle)
                    .padding(SalonsDesign.FILTER_BADGE_BORDER)
                    .background(colors.danger, AppTheme.shapes.circle),
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = chipCount.toString(),
                    style = discoveryBody(SalonsDesign.FILTER_BADGE_TEXT, FontWeight.Bold),
                    color = colors.onGradient,
                    maxLines = 1,
                )
            }
        }
    }
}

/** Design S04 active chips: 34 dp soft pills, 12.5 sp accent label, 22 dp translucent "✕" button at End. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun SalonsActiveChips(chips: List<ActiveFilterChip>, onRemove: (ActiveFilterChip) -> Unit, modifier: Modifier = Modifier) {
    if (chips.isEmpty()) return
    val spacing = AppTheme.spacing
    FlowRow(
        modifier = modifier.fillMaxWidth().padding(start = spacing.space20, end = spacing.space20, bottom = spacing.space12),
        horizontalArrangement = Arrangement.spacedBy(spacing.space8),
        verticalArrangement = Arrangement.spacedBy(spacing.space8),
    ) {
        chips.forEach { chip -> ActiveChip(chip, onRemove = { onRemove(chip) }) }
    }
}

@Composable
private fun ActiveChip(chip: ActiveFilterChip, onRemove: () -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = Modifier
            .height(SalonsDesign.CHIP_HEIGHT)
            .background(colors.soft, AppTheme.shapes.pill)
            .padding(start = spacing.space12, end = spacing.space6),
        horizontalArrangement = Arrangement.spacedBy(spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(
            text = chip.label,
            style = discoveryBody(DiscoveryDesign.TEXT_12_5, FontWeight.SemiBold),
            color = colors.accent,
            maxLines = 1,
        )
        Box(
            modifier = Modifier
                .size(SalonsDesign.CHIP_REMOVE)
                .background(colors.accent.copy(alpha = SalonsDesign.CHIP_REMOVE_BG_ALPHA), AppTheme.shapes.circle)
                .clip(AppTheme.shapes.circle)
                .clickable(role = Role.Button, onClick = onRemove),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = AppIcons.Close,
                contentDescription = stringResource(Res.string.salons_chip_remove, chip.label),
                tint = colors.accent,
                modifier = Modifier.size(SalonsDesign.CHIP_REMOVE_ICON),
            )
        }
    }
}
