package com.fab.wab.merchant.feature.salon.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.divider.AppDivider
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppDropdownField
import com.fab.wab.merchant.designsystem.resources.time_am
import com.fab.wab.merchant.designsystem.resources.time_pm
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.salon.domain.CLOSE_STEPS
import com.fab.wab.merchant.feature.salon.domain.Closure
import com.fab.wab.merchant.feature.salon.domain.DaySchedule
import com.fab.wab.merchant.feature.salon.domain.TIME_STEPS
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_delete
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_edit
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_range
import com.fab.wab.merchant.feature.salon.presentation.resources.closures_add
import com.fab.wab.merchant.feature.salon.presentation.resources.closures_empty
import com.fab.wab.merchant.feature.salon.presentation.resources.closures_hint
import com.fab.wab.merchant.feature.salon.presentation.resources.closures_past
import com.fab.wab.merchant.feature.salon.presentation.resources.closures_title
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_close
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_copy_all
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_day_off
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_error
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_open
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_save
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_title
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_weekly
import org.jetbrains.compose.resources.stringResource
import com.fab.wab.merchant.designsystem.resources.Res as DesignRes

/** PRD M15 (design 05 `on.hours`): Saturday → Friday rows, copy to all, save; closures (upcoming, past collapsed). */
@Composable
fun HoursScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(SalonAnalytics.SCREEN_HOURS)
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.hours_title), onBack = onBack) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            BranchPicker(state.branchScope, onSelect = { onAction(UiAction.OnBranchSelect(it)) })
            Box(modifier = Modifier.weight(1f)) {
                when {
                    state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
                    state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
                    else -> Column(
                        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(AppTheme.spacing.space16),
                        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space16),
                    ) {
                        WeeklyCard(state, onAction)
                        ClosuresSection(state, onAction)
                    }
                }
            }
        }
    }
    HoursDialogs(state, onAction)
}

@Composable
private fun WeeklyCard(state: UiState, onAction: (UiAction) -> Unit) {
    val labels = timeLabels()
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10)) {
            AppText(text = stringResource(Res.string.hours_weekly), style = AppTheme.typography.titleSmall)
            state.week.forEachIndexed { index, day ->
                if (index > 0) AppDivider()
                DayRow(day, invalid = day.day in state.invalidDays, labels = labels, onAction = onAction)
            }
            AppButton(
                text = stringResource(Res.string.hours_save),
                onClick = { onAction(UiAction.OnSaveWeek) },
                modifier = Modifier.fillMaxWidth(),
                enabled = state.canSaveWeek,
                loading = state.saving && state.closureSheet == null,
            )
        }
    }
}

@Composable
private fun DayRow(day: DaySchedule, invalid: Boolean, labels: Map<Int, String>, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space6)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = dayName(day.day), style = AppTheme.typography.bodyLarge)
                if (day.isOff) AppText(
                    text = stringResource(Res.string.hours_day_off),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colors.muted,
                )
            }
            AppSwitch(checked = !day.isOff, onCheckedChange = { onAction(UiAction.OnToggleDay(day.day, it)) })
        }
        if (!day.isOff) {
            Row(horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
                AppDropdownField(
                    options = TIME_STEPS.map { labels.getValue(it) },
                    selectedIndex = TIME_STEPS.indexOf(day.openMinute).takeIf { it >= 0 },
                    onSelect = { onAction(UiAction.OnOpenTime(day.day, TIME_STEPS[it])) },
                    placeholder = stringResource(Res.string.hours_open),
                    label = stringResource(Res.string.hours_open),
                    modifier = Modifier.weight(1f),
                )
                AppDropdownField(
                    options = CLOSE_STEPS.map { labels.getValue(it) },
                    selectedIndex = CLOSE_STEPS.indexOf(day.closeMinute).takeIf { it >= 0 },
                    onSelect = { onAction(UiAction.OnCloseTime(day.day, CLOSE_STEPS[it])) },
                    placeholder = stringResource(Res.string.hours_close),
                    label = stringResource(Res.string.hours_close),
                    modifier = Modifier.weight(1f),
                    error = if (invalid) stringResource(Res.string.hours_error) else null,
                )
            }
            AppButton(stringResource(Res.string.hours_copy_all), { onAction(UiAction.OnCopyToAll(day.day)) }, kind = ButtonKind.Text)
        }
    }
}

@Composable
private fun ClosuresSection(state: UiState, onAction: (UiAction) -> Unit) {
    var showPast by remember { mutableStateOf(false) }
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
        AppText(text = stringResource(Res.string.closures_title), style = AppTheme.typography.titleSmall)
        AppText(text = stringResource(Res.string.closures_hint), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        if (state.upcoming.isEmpty()) AppText(
            text = stringResource(Res.string.closures_empty),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colors.faint,
        )
        state.upcoming.forEach { ClosureRow(it, onAction) }
        AppButton(
            stringResource(Res.string.closures_add),
            { onAction(UiAction.OnAddClosure) },
            Modifier.fillMaxWidth(),
            kind = ButtonKind.Outlined,
        )
        if (state.past.isNotEmpty()) {
            AppButton(stringResource(Res.string.closures_past), { showPast = !showPast }, kind = ButtonKind.Text)
            if (showPast) state.past.forEach { ClosureRow(it, onAction) }
        }
    }
}

@Composable
private fun ClosureRow(closure: Closure, onAction: (UiAction) -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = rangeText(closure), style = AppTheme.typography.labelLarge)
                AppText(text = closure.reason, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            }
            if (closure.editable) {
                AppButton(stringResource(Res.string.closure_edit), { onAction(UiAction.OnEditClosure(closure.id)) }, kind = ButtonKind.Text)
                AppButton(
                    stringResource(Res.string.closure_delete),
                    { onAction(UiAction.OnDeleteClosure(closure.id)) },
                    kind = ButtonKind.Text,
                )
            }
        }
    }
}

@Composable
internal fun rangeText(closure: Closure): String {
    val from = TimeFormat.isoDateText(closure.from.toString()).orEmpty()
    val to = TimeFormat.isoDateText(closure.to.toString()).orEmpty()
    return if (closure.from == closure.to) from else stringResource(Res.string.closure_range, from, to)
}

/** 12-hour label per minute of the day ("24:00" closes at midnight). */
@Composable
private fun timeLabels(): Map<Int, String> {
    val am = stringResource(DesignRes.string.time_am)
    val pm = stringResource(DesignRes.string.time_pm)
    return remember(am, pm) { (TIME_STEPS + CLOSE_STEPS).distinct().associateWith { TimeFormat.to12Hour(hhmm(it), am, pm).orEmpty() } }
}
