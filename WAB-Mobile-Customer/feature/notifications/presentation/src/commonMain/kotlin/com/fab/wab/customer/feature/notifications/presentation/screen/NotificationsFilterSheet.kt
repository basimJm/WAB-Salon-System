package com.fab.wab.customer.feature.notifications.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.designsystem.components.button.AppOutlinedButton
import com.fab.wab.customer.designsystem.components.button.AppPrimaryButton
import com.fab.wab.customer.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.components.textfield.AppTextField
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.FilterDraft
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.customer.feature.notifications.presentation.resources.Res
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_apply
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_dates_error
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_filter_title
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_from_label
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_reset
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_search_hint
import com.fab.wab.customer.feature.notifications.presentation.resources.notifications_to_label
import org.jetbrains.compose.resources.stringResource

/** S19 filter sheet: date range (ISO text fields until a date picker lands in the design system) + search + Apply / Reset. */
@Composable
internal fun NotificationsFilterSheet(draft: FilterDraft, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnSheetDismiss) }) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space12),
        ) {
            AppText(text = stringResource(Res.string.notifications_filter_title), style = AppTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                AppTextField(
                    value = draft.from,
                    onValueChange = { onAction(UiAction.OnDraftFromChange(it)) },
                    modifier = Modifier.weight(1f),
                    label = stringResource(Res.string.notifications_from_label),
                )
                AppTextField(
                    value = draft.to,
                    onValueChange = { onAction(UiAction.OnDraftToChange(it)) },
                    modifier = Modifier.weight(1f),
                    label = stringResource(Res.string.notifications_to_label),
                    error = if (draft.datesValid) null else stringResource(Res.string.notifications_dates_error),
                )
            }
            AppTextField(
                value = draft.query,
                onValueChange = { onAction(UiAction.OnDraftQueryChange(it)) },
                modifier = Modifier.fillMaxWidth(),
                placeholder = stringResource(Res.string.notifications_search_hint),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                AppOutlinedButton(
                    text = stringResource(Res.string.notifications_reset),
                    onClick = { onAction(UiAction.OnResetFilters) },
                    modifier = Modifier.weight(1f),
                )
                AppPrimaryButton(
                    text = stringResource(Res.string.notifications_apply),
                    onClick = { onAction(UiAction.OnApplyFilters) },
                    modifier = Modifier.weight(1f),
                    enabled = draft.datesValid,
                )
            }
        }
    }
}
