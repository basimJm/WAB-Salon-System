package com.fab.wab.merchant.feature.salon.presentation.screen

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
import com.fab.wab.merchant.feature.salon.domain.HoursLimits
import com.fab.wab.merchant.feature.salon.domain.closureValid
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ClosureForm
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_delete
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_delete_title
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_edit
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_from
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_reason
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_reason_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_save
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_sheet_sub
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_to
import com.fab.wab.merchant.feature.salon.presentation.resources.closures_add
import com.fab.wab.merchant.feature.salon.presentation.resources.conflict_back
import com.fab.wab.merchant.feature.salon.presentation.resources.conflict_body
import com.fab.wab.merchant.feature.salon.presentation.resources.conflict_cancel
import com.fab.wab.merchant.feature.salon.presentation.resources.conflict_refund
import com.fab.wab.merchant.feature.salon.presentation.resources.conflict_title
import com.fab.wab.merchant.feature.salon.presentation.resources.day_fri
import com.fab.wab.merchant.feature.salon.presentation.resources.day_mon
import com.fab.wab.merchant.feature.salon.presentation.resources.day_sat
import com.fab.wab.merchant.feature.salon.presentation.resources.day_sun
import com.fab.wab.merchant.feature.salon.presentation.resources.day_thu
import com.fab.wab.merchant.feature.salon.presentation.resources.day_tue
import com.fab.wab.merchant.feature.salon.presentation.resources.day_wed
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_cancel
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

private const val MINUTES_PER_HOUR = 60
private const val TIME_PAD = 2
private const val ZERO = '0'
private const val TIME_SEPARATOR = ":"

/** Minutes → `HH:mm` (24:00 shows as midnight). */
internal fun hhmm(minutes: Int): String {
    val wrapped = minutes % HoursLimits.MINUTES_PER_DAY
    return (wrapped / MINUTES_PER_HOUR).toString().padStart(
        TIME_PAD,
        ZERO,
    ) + TIME_SEPARATOR + (wrapped % MINUTES_PER_HOUR).toString().padStart(TIME_PAD, ZERO)
}

@Composable
internal fun dayName(day: DayOfWeek): String = stringResource(
    when (day) {
        DayOfWeek.SATURDAY -> Res.string.day_sat
        DayOfWeek.SUNDAY -> Res.string.day_sun
        DayOfWeek.MONDAY -> Res.string.day_mon
        DayOfWeek.TUESDAY -> Res.string.day_tue
        DayOfWeek.WEDNESDAY -> Res.string.day_wed
        DayOfWeek.THURSDAY -> Res.string.day_thu
        DayOfWeek.FRIDAY -> Res.string.day_fri
    },
)

/** Closure sheet (design 05 `closureAdd`), conflict dialog (`closureConflict`) and the remove confirmation. */
@Composable
internal fun HoursDialogs(state: UiState, onAction: (UiAction) -> Unit) {
    state.closureSheet?.let { ClosureSheet(it, state, onAction) }
    state.conflict?.let { conflict ->
        val count = conflict.bookingIds.size
        AppDialog(
            title = stringResource(Res.string.conflict_title),
            confirmText = stringResource(Res.string.conflict_cancel),
            onConfirm = { onAction(UiAction.OnConflictCancelBookings) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
            message = pluralStringResource(
                Res.plurals.conflict_body,
                count,
                count,
            ) + PARAGRAPH + stringResource(Res.string.conflict_refund),
            dismissText = stringResource(Res.string.conflict_back),
            icon = AppIcons.Calendar,
            tone = StatusTone.Warning,
        )
    }
    if (state.deleteClosureId != null) {
        AppDialog(
            title = stringResource(Res.string.closure_delete_title),
            confirmText = stringResource(Res.string.closure_delete),
            onConfirm = { onAction(UiAction.OnDeleteConfirm) },
            onDismiss = { onAction(UiAction.OnDialogDismiss) },
            dismissText = stringResource(Res.string.hours_cancel),
            icon = AppIcons.Delete,
            tone = StatusTone.Danger,
        )
    }
}

private const val PARAGRAPH = "\n"

private enum class DateField { FROM, TO }

@Composable
private fun ClosureSheet(form: ClosureForm, state: UiState, onAction: (UiAction) -> Unit) {
    var picking by remember { mutableStateOf<DateField?>(null) }
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = { onAction(UiAction.OnClosureDismiss) }) {
        Column(modifier = Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppText(
                text = stringResource(if (form.id == null) Res.string.closures_add else Res.string.closure_edit),
                style = AppTheme.typography.titleMedium,
            )
            AppText(
                text = stringResource(Res.string.closure_sheet_sub),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                DateButton(
                    stringResource(Res.string.closure_from),
                    form.from,
                    onClick = { picking = DateField.FROM },
                    modifier = Modifier.weight(1f),
                )
                DateButton(
                    stringResource(Res.string.closure_to),
                    form.to,
                    onClick = { picking = DateField.TO },
                    modifier = Modifier.weight(1f),
                )
            }
            AppTextField(
                value = form.reason,
                onValueChange = { onAction(UiAction.OnClosureReason(it)) },
                label = stringResource(Res.string.closure_reason),
                placeholder = stringResource(Res.string.closure_reason_hint),
            )
            AppButton(
                text = stringResource(Res.string.closure_save),
                onClick = { onAction(UiAction.OnClosureSave) },
                modifier = Modifier.fillMaxWidth(),
                enabled = closureValid(form.from, form.to, form.reason, state.today),
                loading = state.saving,
            )
        }
    }
    picking?.let { field ->
        val initial = (if (field == DateField.FROM) form.from else form.to) ?: state.today
        AppDatePickerDialog(
            initialIsoDate = initial.toString(),
            onConfirm = { iso ->
                picking = null
                val date = runCatching { LocalDate.parse(iso) }.getOrNull() ?: return@AppDatePickerDialog
                onAction(if (field == DateField.FROM) UiAction.OnClosureFrom(date) else UiAction.OnClosureTo(date))
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
