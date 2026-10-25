package com.fab.wab.merchant.feature.team.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDatePickerDialog
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.team.presentation.controller.contract.LeaveForm
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiState
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.staff_conflict_body
import com.fab.wab.merchant.feature.team.presentation.resources.staff_from
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_add
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_delete
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_delete_title
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_edit
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_note
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_save
import com.fab.wab.merchant.feature.team.presentation.resources.staff_to
import com.fab.wab.merchant.feature.team.presentation.resources.team_cancel
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.stringResource

/** Staff profile dialogs: the leave add / edit sheet, the remove confirmation and the affected-bookings conflict. */
@Composable
internal fun StaffDialogs(state: UiState, onAction: (UiAction) -> Unit) {
    state.leaveSheet?.let { LeaveSheet(it, state, onAction) }
    if (state.conflict != null) {
        AffectedBookingsSheet(
            body = stringResource(Res.string.staff_conflict_body),
            onReassign = { onAction(UiAction.OnConflictReassign) },
            onCancelBookings = { onAction(UiAction.OnConflictCancelBookings) },
            onBack = { onAction(UiAction.OnDismiss) },
        )
    }
    if (state.deleteLeaveId != null) {
        AppDialog(
            title = stringResource(Res.string.staff_leave_delete_title),
            confirmText = stringResource(Res.string.staff_leave_delete),
            onConfirm = { onAction(UiAction.OnDeleteConfirm) },
            onDismiss = { onAction(UiAction.OnDismiss) },
            dismissText = stringResource(Res.string.team_cancel),
            icon = AppIcons.Delete,
            tone = StatusTone.Danger,
        )
    }
}

private enum class LeaveDate { FROM, TO }

@Composable
private fun LeaveSheet(form: LeaveForm, state: UiState, onAction: (UiAction) -> Unit) {
    var picking by remember { mutableStateOf<LeaveDate?>(null) }
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnLeaveDismiss) }) {
        Column(modifier = Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppText(
                text = stringResource(if (form.id == null) Res.string.staff_leave_add else Res.string.staff_leave_edit),
                style = AppTheme.typography.titleMedium,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                DateButton(
                    stringResource(Res.string.staff_from),
                    form.from,
                    onClick = { picking = LeaveDate.FROM },
                    modifier = Modifier.weight(1f),
                )
                DateButton(
                    stringResource(Res.string.staff_to),
                    form.to,
                    onClick = { picking = LeaveDate.TO },
                    modifier = Modifier.weight(1f),
                )
            }
            AppTextField(
                value = form.note,
                onValueChange = { onAction(UiAction.OnLeaveNote(it)) },
                label = stringResource(Res.string.staff_leave_note),
                singleLine = false,
            )
            AppButton(
                text = stringResource(Res.string.staff_leave_save),
                onClick = { onAction(UiAction.OnLeaveSave) },
                modifier = Modifier.fillMaxWidth(),
                enabled = state.leaveValid,
                loading = state.saving,
            )
        }
    }
    picking?.let { field ->
        AppDatePickerDialog(
            initialIsoDate = ((if (field == LeaveDate.FROM) form.from else form.to) ?: state.today).toString(),
            onConfirm = { iso ->
                picking = null
                val date = runCatching { LocalDate.parse(iso) }.getOrNull() ?: return@AppDatePickerDialog
                onAction(if (field == LeaveDate.FROM) UiAction.OnLeaveFrom(date) else UiAction.OnLeaveTo(date))
            },
            onDismiss = { picking = null },
        )
    }
}

@Composable
private fun DateButton(label: String, date: LocalDate?, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
        AppText(text = label, style = AppTheme.typography.labelMedium, color = AppTheme.colors.muted)
        AppButton(
            text = date?.let { TimeFormat.isoDateText(it.toString()) }.orEmpty().ifEmpty { label },
            onClick = onClick,
            modifier = Modifier.fillMaxWidth(),
            kind = ButtonKind.Outlined,
            leadingIcon = AppIcons.Calendar,
        )
    }
}
