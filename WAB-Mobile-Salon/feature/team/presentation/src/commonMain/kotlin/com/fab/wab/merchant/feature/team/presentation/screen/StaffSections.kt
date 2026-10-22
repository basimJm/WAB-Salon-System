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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.control.AppCheckbox
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.dialog.AppDialog
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDatePickerDialog
import com.fab.wab.merchant.designsystem.components.textfield.AppDropdownField
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.time_am
import com.fab.wab.merchant.designsystem.resources.time_pm
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.team.domain.Leave
import com.fab.wab.merchant.feature.team.domain.OpenHours
import com.fab.wab.merchant.feature.team.domain.StaffField
import com.fab.wab.merchant.feature.team.domain.StaffLimits
import com.fab.wab.merchant.feature.team.presentation.controller.contract.LeaveForm
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiState
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.day_fri
import com.fab.wab.merchant.feature.team.presentation.resources.day_mon
import com.fab.wab.merchant.feature.team.presentation.resources.day_sat
import com.fab.wab.merchant.feature.team.presentation.resources.day_sun
import com.fab.wab.merchant.feature.team.presentation.resources.day_thu
import com.fab.wab.merchant.feature.team.presentation.resources.day_tue
import com.fab.wab.merchant.feature.team.presentation.resources.day_wed
import com.fab.wab.merchant.feature.team.presentation.resources.staff_closed
import com.fab.wab.merchant.feature.team.presentation.resources.staff_conflict_body
import com.fab.wab.merchant.feature.team.presentation.resources.staff_custom_hours
import com.fab.wab.merchant.feature.team.presentation.resources.staff_days
import com.fab.wab.merchant.feature.team.presentation.resources.staff_days_error
import com.fab.wab.merchant.feature.team.presentation.resources.staff_days_hint
import com.fab.wab.merchant.feature.team.presentation.resources.staff_edit
import com.fab.wab.merchant.feature.team.presentation.resources.staff_from
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_add
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_delete
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_delete_title
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_edit
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_note
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_save
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leaves
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leaves_empty
import com.fab.wab.merchant.feature.team.presentation.resources.staff_range
import com.fab.wab.merchant.feature.team.presentation.resources.staff_to
import com.fab.wab.merchant.feature.team.presentation.resources.team_cancel
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.merchant.designsystem.resources.Res as DesignRes

/** Salon week order (Saturday → Friday). */
private val WEEK = listOf(
    DayOfWeek.SATURDAY, DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY,
)
private const val MINUTES_PER_HOUR = 60
private const val MINUTES_PER_DAY = 1_440
private const val TIME_PAD = 2
private const val ZERO = '0'
private const val TIME_SEPARATOR = ":"

@Composable
internal fun WorkingDays(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        AppText(text = stringResource(Res.string.staff_days), style = AppTheme.typography.labelLarge)
        AppText(text = stringResource(Res.string.staff_days_hint), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        if (StaffField.DAYS in state.visibleErrors) AppText(text = stringResource(Res.string.staff_days_error), style = AppTheme.typography.bodySmall, color = AppTheme.colors.danger)
        WEEK.forEach { day -> DayRow(day, state, onAction) }
    }
}

@Composable
private fun DayRow(day: DayOfWeek, state: UiState, onAction: (UiAction) -> Unit) {
    val open = state.salonDays[day]
    val selected = state.draft.workingDays.firstOrNull { it.day == day }
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppCheckbox(checked = selected != null, onCheckedChange = { onAction(UiAction.OnDay(day, it)) }, enabled = open != null || selected != null)
                AppText(text = dayName(day), style = AppTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                if (open == null) AppText(text = stringResource(Res.string.staff_closed), style = AppTheme.typography.labelSmall, color = AppTheme.colors.faint)
            }
            if (selected != null && open != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AppText(text = stringResource(Res.string.staff_custom_hours), style = AppTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    AppSwitch(checked = selected.hasCustomHours, onCheckedChange = { onAction(UiAction.OnCustomHours(day, it)) })
                }
                if (selected.hasCustomHours) HoursPickers(day, open, selected.startMinute, selected.endMinute, onAction)
            }
        }
    }
}

@Composable
private fun HoursPickers(day: DayOfWeek, open: OpenHours, start: Int?, end: Int?, onAction: (UiAction) -> Unit) {
    val steps = (open.openMinute..open.closeMinute step StaffLimits.STEP_MINUTES).toList()
    val labels = timeLabels(steps)
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10)) {
        AppDropdownField(
            options = labels,
            selectedIndex = steps.indexOf(start).takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnDayStart(day, steps[it])) },
            placeholder = stringResource(Res.string.staff_from),
            label = stringResource(Res.string.staff_from),
            modifier = Modifier.weight(1f),
        )
        AppDropdownField(
            options = labels,
            selectedIndex = steps.indexOf(end).takeIf { it >= 0 },
            onSelect = { onAction(UiAction.OnDayEnd(day, steps[it])) },
            placeholder = stringResource(Res.string.staff_to),
            label = stringResource(Res.string.staff_to),
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
internal fun Leaves(state: UiState, onAction: (UiAction) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppText(text = stringResource(Res.string.staff_leaves), style = AppTheme.typography.labelLarge)
        if (state.leaves.isEmpty()) AppText(text = stringResource(Res.string.staff_leaves_empty), style = AppTheme.typography.bodySmall, color = AppTheme.colors.faint)
        state.leaves.forEach { LeaveRow(it, onAction) }
        AppButton(stringResource(Res.string.staff_leave_add), { onAction(UiAction.OnAddLeave) }, Modifier.fillMaxWidth(), kind = ButtonKind.Outlined)
    }
}

@Composable
private fun LeaveRow(leave: Leave, onAction: (UiAction) -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = rangeText(leave.from, leave.to), style = AppTheme.typography.labelLarge)
                leave.note?.let { AppText(text = it, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted) }
            }
            if (leave.editable) {
                AppButton(stringResource(Res.string.staff_edit), { onAction(UiAction.OnEditLeave(leave.id)) }, kind = ButtonKind.Text)
                AppButton(stringResource(Res.string.staff_leave_delete), { onAction(UiAction.OnDeleteLeave(leave.id)) }, kind = ButtonKind.Text)
            }
        }
    }
}

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
            AppText(text = stringResource(if (form.id == null) Res.string.staff_leave_add else Res.string.staff_leave_edit), style = AppTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                DateButton(stringResource(Res.string.staff_from), form.from, Modifier.weight(1f)) { picking = LeaveDate.FROM }
                DateButton(stringResource(Res.string.staff_to), form.to, Modifier.weight(1f)) { picking = LeaveDate.TO }
            }
            AppTextField(value = form.note, onValueChange = { onAction(UiAction.OnLeaveNote(it)) }, label = stringResource(Res.string.staff_leave_note), singleLine = false)
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
private fun DateButton(label: String, date: LocalDate?, modifier: Modifier, onClick: () -> Unit) {
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

@Composable
private fun rangeText(from: LocalDate, to: LocalDate): String {
    val start = TimeFormat.isoDateText(from.toString()).orEmpty()
    return if (from == to) start else stringResource(Res.string.staff_range, start, TimeFormat.isoDateText(to.toString()).orEmpty())
}

@Composable
private fun timeLabels(minutes: List<Int>): List<String> {
    val am = stringResource(DesignRes.string.time_am)
    val pm = stringResource(DesignRes.string.time_pm)
    return remember(minutes, am, pm) {
        minutes.map { minute ->
            val wrapped = minute % MINUTES_PER_DAY
            val hhmm = (wrapped / MINUTES_PER_HOUR).toString().padStart(TIME_PAD, ZERO) + TIME_SEPARATOR + (wrapped % MINUTES_PER_HOUR).toString().padStart(TIME_PAD, ZERO)
            TimeFormat.to12Hour(hhmm, am, pm).orEmpty()
        }
    }
}

@Composable
private fun dayName(day: DayOfWeek): String = stringResource(
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
