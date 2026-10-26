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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.control.AppRadioButton
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.format.jodText
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsDefaults
import com.fab.wab.merchant.feature.bookings.domain.model.CANCEL_REASONS
import com.fab.wab.merchant.feature.bookings.domain.model.REJECT_REASONS
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import com.fab.wab.merchant.feature.bookings.domain.usecase.isReasonValid
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.DetailsDialog
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.cancel_full_refund
import com.fab.wab.merchant.feature.bookings.presentation.resources.cancel_sub
import com.fab.wab.merchant.feature.bookings.presentation.resources.cancel_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.complete_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.complete_note
import com.fab.wab.merchant.feature.bookings.presentation.resources.complete_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.confirm_cancel
import com.fab.wab.merchant.feature.bookings.presentation.resources.confirm_complete
import com.fab.wab.merchant.feature.bookings.presentation.resources.confirm_no_show
import com.fab.wab.merchant.feature.bookings.presentation.resources.confirm_reassign
import com.fab.wab.merchant.feature.bookings.presentation.resources.confirm_reject
import com.fab.wab.merchant.feature.bookings.presentation.resources.dialog_back
import com.fab.wab.merchant.feature.bookings.presentation.resources.dialog_ok
import com.fab.wab.merchant.feature.bookings.presentation.resources.handled_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.handled_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.no_show_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.no_show_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.reason_exceptional_closure
import com.fab.wab.merchant.feature.bookings.presentation.resources.reason_fully_booked
import com.fab.wab.merchant.feature.bookings.presentation.resources.reason_other
import com.fab.wab.merchant.feature.bookings.presentation.resources.reason_other_hint
import com.fab.wab.merchant.feature.bookings.presentation.resources.reason_salon_emergency
import com.fab.wab.merchant.feature.bookings.presentation.resources.reason_service_unavailable
import com.fab.wab.merchant.feature.bookings.presentation.resources.reason_staff_unavailable
import com.fab.wab.merchant.feature.bookings.presentation.resources.reassign_current
import com.fab.wab.merchant.feature.bookings.presentation.resources.reassign_note
import com.fab.wab.merchant.feature.bookings.presentation.resources.reassign_sub
import com.fab.wab.merchant.feature.bookings.presentation.resources.reassign_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.reject_sub
import com.fab.wab.merchant.feature.bookings.presentation.resources.reject_title
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** The M09 action sheets and confirmations (design 03 `on.reject`, `on.cancel`, `on.complete`, `on.reassign`). */
@Composable
internal fun BookingDetailsDialogs(state: UiState, onAction: (UiAction) -> Unit) {
    val dismiss = { onAction(UiAction.OnDialogDismiss) }
    when (val dialog = state.dialog) {
        is DetailsDialog.Reason -> ReasonSheet(
            dialog = dialog,
            acting = state.acting != null,
            onSelect = { onAction(UiAction.OnReasonSelect(it)) },
            onText = { onAction(UiAction.OnReasonText(it)) },
            onConfirm = { onAction(UiAction.OnDialogConfirm) },
            onDismiss = dismiss,
        )
        is DetailsDialog.Confirm -> ConfirmDialog(dialog.action, state, onAction)
        is DetailsDialog.Reassign -> ReassignSheet(dialog, state, onAction)
        DetailsDialog.AlreadyHandled -> AppDialog(
            title = stringResource(Res.string.handled_title),
            confirmText = stringResource(Res.string.dialog_ok),
            onConfirm = dismiss,
            onDismiss = dismiss,
            message = stringResource(Res.string.handled_body),
            tone = StatusTone.Warning,
        )
        null -> Unit
    }
}

@Composable
internal fun ReasonSheet(
    dialog: DetailsDialog.Reason,
    acting: Boolean,
    onSelect: (ResponseReason) -> Unit,
    onText: (String) -> Unit,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val reject = dialog.action == BookingAction.REJECT
    val reasons = if (reject) REJECT_REASONS else CANCEL_REASONS
    val valid = isReasonValid(dialog.selected, dialog.text, BookingsDefaults.REASON_TEXT_MAX)
    SheetColumn(
        title = stringResource(if (reject) Res.string.reject_title else Res.string.cancel_title),
        subtitle = stringResource(if (reject) Res.string.reject_sub else Res.string.cancel_sub),
        onDismiss = onDismiss,
    ) {
        reasons.forEach { reason ->
            ChoiceRow(stringResource(reason.label()), dialog.selected == reason) { onSelect(reason) }
        }
        if (dialog.selected == ResponseReason.OTHER) {
            AppTextField(
                value = dialog.text,
                onValueChange = onText,
                modifier = Modifier.fillMaxWidth(),
                placeholder = stringResource(Res.string.reason_other_hint),
                singleLine = false,
            )
        }
        if (!reject) AppText(
            text = stringResource(Res.string.cancel_full_refund),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colors.muted,
        )
        AppButton(
            text = stringResource(if (reject) Res.string.confirm_reject else Res.string.confirm_cancel),
            onClick = onConfirm,
            modifier = Modifier.fillMaxWidth(),
            kind = ButtonKind.Destructive,
            enabled = valid,
            loading = acting,
        )
    }
}

@Composable
private fun ConfirmDialog(action: BookingAction, state: UiState, onAction: (UiAction) -> Unit) {
    val complete = action == BookingAction.COMPLETE
    val remaining = jodText(state.details?.money?.remaining.orEmpty())
    AppDialog(
        title = stringResource(if (complete) Res.string.complete_title else Res.string.no_show_title),
        confirmText = stringResource(if (complete) Res.string.confirm_complete else Res.string.confirm_no_show),
        onConfirm = { onAction(UiAction.OnDialogConfirm) },
        onDismiss = { onAction(UiAction.OnDialogDismiss) },
        message = if (complete) {
            stringResource(Res.string.complete_body, remaining) + PARAGRAPH + stringResource(Res.string.complete_note)
        } else {
            stringResource(Res.string.no_show_body)
        },
        dismissText = stringResource(Res.string.dialog_back),
        icon = if (complete) AppIcons.Check else AppIcons.Info,
        tone = if (complete) StatusTone.Success else StatusTone.Warning,
    )
}

@Composable
private fun ReassignSheet(dialog: DetailsDialog.Reassign, state: UiState, onAction: (UiAction) -> Unit) {
    val persons = state.details?.persons.orEmpty()
    val person = persons.getOrNull(dialog.personIndex)
    SheetColumn(
        title = stringResource(Res.string.reassign_title),
        subtitle = stringResource(Res.string.reassign_sub),
        onDismiss = { onAction(UiAction.OnDialogDismiss) },
    ) {
        if (persons.size > 1) {
            persons.forEachIndexed { index, item ->
                ChoiceRow(item.name, index == dialog.personIndex) { onAction(UiAction.OnReassignPerson(index)) }
            }
        }
        person?.staff?.let {
            AppText(
                text = stringResource(Res.string.reassign_current, it.name),
                style = AppTheme.typography.labelMedium,
                color = AppTheme.colors.muted,
            )
        }
        state.reassignStaff.filter { it.id != person?.staff?.id }.forEach { staff ->
            ChoiceRow(staff.name, staff.id == dialog.staffId) { onAction(UiAction.OnReassignStaff(staff.id)) }
        }
        AppText(text = stringResource(Res.string.reassign_note), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        AppButton(
            text = stringResource(Res.string.confirm_reassign),
            onClick = { onAction(UiAction.OnDialogConfirm) },
            modifier = Modifier.fillMaxWidth(),
            enabled = dialog.staffId != null,
            loading = state.acting == BookingAction.REASSIGN,
        )
    }
}

@Composable
private fun SheetColumn(title: String, subtitle: String, onDismiss: () -> Unit, content: @Composable () -> Unit) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = onDismiss) {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space10),
        ) {
            AppText(text = title, style = AppTheme.typography.titleMedium)
            AppText(text = subtitle, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            content()
        }
    }
}

@Composable
private fun ChoiceRow(text: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = AppTheme.sizes.touchTarget)
            .clickable(role = Role.RadioButton, onClick = onClick),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        AppRadioButton(selected = selected, onClick = onClick)
        AppText(text = text, style = AppTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
    }
}

internal fun ResponseReason.label(): StringResource = when (this) {
    ResponseReason.FULLY_BOOKED -> Res.string.reason_fully_booked
    ResponseReason.STAFF_UNAVAILABLE -> Res.string.reason_staff_unavailable
    ResponseReason.SERVICE_UNAVAILABLE -> Res.string.reason_service_unavailable
    ResponseReason.SALON_EMERGENCY -> Res.string.reason_salon_emergency
    ResponseReason.EXCEPTIONAL_CLOSURE -> Res.string.reason_exceptional_closure
    ResponseReason.OTHER -> Res.string.reason_other
}

private const val PARAGRAPH = "\n"
