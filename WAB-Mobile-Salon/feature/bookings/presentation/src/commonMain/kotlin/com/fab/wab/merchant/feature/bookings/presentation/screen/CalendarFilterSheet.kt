package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.control.AppCheckbox
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_filter_all
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_filter_apply
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_filter_sub
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_filter_title
import org.jetbrains.compose.resources.stringResource

/** Design 04 `filterOn`: choose the staff columns shown; none selected = all staff. */
@Composable
internal fun CalendarFilterSheet(state: UiState, onAction: (UiAction) -> Unit) {
    var selected by remember(state.staffFilter) { mutableStateOf(state.staffFilter) }
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnFilterDismiss) }) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space8),
        ) {
            AppText(text = stringResource(Res.string.calendar_filter_title), style = AppTheme.typography.titleMedium)
            AppText(
                text = stringResource(Res.string.calendar_filter_sub),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
            CheckRow(stringResource(Res.string.calendar_filter_all), selected.isEmpty()) { selected = emptySet() }
            state.staff.forEach { staff ->
                CheckRow(staff.name, staff.id in selected) {
                    selected = if (staff.id in selected) selected - staff.id else selected + staff.id
                }
            }
            AppButton(
                text = stringResource(Res.string.calendar_filter_apply),
                onClick = { onAction(UiAction.OnFilterApply(selected)) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun CheckRow(text: String, checked: Boolean, onToggle: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = AppTheme.sizes.touchTarget)
            .clickable(role = Role.Checkbox, onClick = onToggle),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        AppCheckbox(checked = checked, onCheckedChange = { onToggle() })
        AppText(text = text, style = AppTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
    }
}
