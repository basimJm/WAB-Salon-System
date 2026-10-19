package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.softShadow

/**
 * S12 dropdown as the design draws it: a 52 dp field (radius 14, 1.5 dp border, chevron 14 faint) that expands an
 * inline option list below it (`margin-top:6px`, radius 14, hairline border, `0 12px 30px rgba(31,34,51,.12)`,
 * options `padding:13px 16px`, hairline separators, the selected one soft/accent/600). `AppDropdownField` opens a
 * Material popup instead, so this stays private here. Candidate for the design system.
 */
@Composable
internal fun AuthDropdownField(
    options: List<String>,
    selectedIndex: Int?,
    onSelect: (Int) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    error: Boolean = false,
    enabled: Boolean = true,
) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    val selected = selectedIndex?.let { options.getOrNull(it) }
    val open = expanded && enabled
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(AppTheme.sizes.fieldHeight)
                .alpha(if (enabled) 1f else AppTheme.alpha.disabled)
                .clip(shape)
                .background(if (enabled) colors.card else colors.surface)
                .border(AppTheme.sizes.borderWidth, if (error) colors.danger else colors.line, shape)
                .clickable(enabled = enabled, role = Role.DropdownList) { expanded = !expanded }
                .padding(horizontal = AppTheme.spacing.space14),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            AppText(
                text = selected ?: placeholder,
                style = AppTheme.typography.bodyLarge.copy(fontSize = AuthDesign.fieldTextSize),
                color = if (selected != null) colors.ink else colors.faint,
                maxLines = 1,
                modifier = Modifier.weight(1f),
            )
            Icon(
                imageVector = AppIcons.ExpandMore,
                contentDescription = null,
                tint = colors.faint,
                modifier = Modifier.size(AuthDesign.dropdownChevron),
            )
        }
        if (open) {
            OptionList(
                options = options,
                selectedIndex = selectedIndex,
                onSelect = { index ->
                    expanded = false
                    onSelect(index)
                },
            )
        }
    }
}

@Composable
private fun OptionList(options: List<String>, selectedIndex: Int?, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = AppTheme.shapes.medium
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = AppTheme.spacing.space6)
            .softShadow(AppTheme.elevation.raised, colors.shadow.copy(alpha = AuthDesign.listShadowAlpha), shape)
            .clip(shape)
            .background(colors.card)
            .border(AppTheme.sizes.hairline, colors.line, shape),
    ) {
        options.forEachIndexed { index, option ->
            val isSelected = index == selectedIndex
            AppText(
                text = option,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(if (isSelected) colors.soft else colors.card)
                    .clickable(role = Role.Button) { onSelect(index) }
                    .padding(vertical = AuthDesign.optionVertical, horizontal = AuthDesign.optionHorizontal),
                style = AppTheme.typography.bodyMedium.copy(
                    fontSize = AuthDesign.optionSize,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                ),
                color = if (isSelected) colors.accent else colors.ink,
                maxLines = 1,
            )
            if (index < options.lastIndex) {
                androidx.compose.foundation.layout.Spacer(
                    Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(colors.line),
                )
            }
        }
    }
}
