package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.chip.AppTimeSlotChip
import com.fab.wab.customer.designsystem.components.chip.SlotState
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerLine
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.CalendarDay
import com.fab.wab.customer.feature.booking.domain.model.toSalonDay
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_label
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_next
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_previous
import com.fab.wab.customer.feature.booking.presentation.resources.booking_no_slots
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pick_date
import com.fab.wab.customer.feature.booking.presentation.resources.booking_slot_full
import com.fab.wab.customer.feature.booking.presentation.resources.booking_slots_title
import com.fab.wab.customer.feature.salon.presentation.screen.nameRes
import kotlinx.datetime.DayOfWeek
import org.jetbrains.compose.resources.stringResource

/** Step 2 (PRD S16): calendar (closed / past / too-far days disabled) + 15-minute slots with "Full" chips. */
@Composable
internal fun SlotStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space16),
    ) {
        MonthCalendar(state, onAction)
        when {
            state.selectedDate == null -> AppText(text = stringResource(Res.string.booking_pick_date), color = AppTheme.colors.muted)
            state.slotsLoading -> repeat(SHIMMER_ROWS) { AppShimmerLine(Modifier.fillMaxWidth()) }
            state.slotsError != null ->
                AppErrorState(onRetry = { onAction(UiAction.OnDateSelect(state.selectedDate)) }, message = state.slotsError)
            state.availability?.hasAvailableSlot != true ->
                AppText(text = stringResource(Res.string.booking_no_slots), color = AppTheme.colors.muted)
            else -> SlotsGrid(state, onAction)
        }
    }
}

@Composable
private fun MonthCalendar(state: UiState, onAction: (UiAction) -> Unit) {
    val months = state.calendar.map { it.date.year to it.date.monthNumber }.distinct()
    val month = months.getOrNull(state.visibleMonth) ?: return
    val days = state.calendar.filter { it.date.year == month.first && it.date.monthNumber == month.second }
    val spacing = AppTheme.spacing
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            AppIconButton(
                icon = AppIcons.Back,
                contentDescription = stringResource(Res.string.booking_month_previous),
                onClick = { onAction(UiAction.OnMonthChange(-1)) },
                enabled = state.visibleMonth > 0,
            )
            AppText(
                text = stringResource(Res.string.booking_month_label, month.second, month.first),
                modifier = Modifier.weight(1f),
                style = AppTheme.typography.titleMedium,
            )
            AppIconButton(
                icon = AppIcons.Forward,
                contentDescription = stringResource(Res.string.booking_month_next),
                onClick = { onAction(UiAction.OnMonthChange(1)) },
                enabled = state.visibleMonth < months.lastIndex,
            )
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            WEEK.forEach { day ->
                AppText(
                    text = stringResource(day.toSalonDay().nameRes()).take(DAY_LABEL_LENGTH),
                    modifier = Modifier.weight(1f),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colors.muted,
                )
            }
        }
        val leading = WEEK.indexOf(days.first().date.dayOfWeek)
        val cells: List<CalendarDay?> = List(leading) { null } + days
        cells.chunked(WEEK.size).forEach { week ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(spacing.space4)) {
                week.forEach { day -> DayCell(day, state.selectedDate == day?.date, onAction, Modifier.weight(1f)) }
                repeat(WEEK.size - week.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun DayCell(day: CalendarDay?, selected: Boolean, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    if (day == null) {
        Box(modifier.aspectRatio(1f))
        return
    }
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .clip(AppTheme.shapes.small)
            .background(if (selected) colors.accent else if (day.enabled) colors.soft else colors.surface)
            .clickable(enabled = day.enabled, role = Role.Button) { onAction(UiAction.OnDateSelect(day.date)) },
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = day.date.dayOfMonth.toString(),
            color = when {
                selected -> colors.onGradient
                day.enabled -> colors.ink
                else -> colors.faint
            },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SlotsGrid(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val am = stringResource(CoreRes.string.time_am)
    val pm = stringResource(CoreRes.string.time_pm)
    val full = stringResource(Res.string.booking_slot_full)
    Column(verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
        AppText(text = stringResource(Res.string.booking_slots_title), style = AppTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(spacing.space8), verticalArrangement = Arrangement.spacedBy(spacing.space8)) {
            state.availability?.slots.orEmpty().forEach { slot ->
                val label = TimeFormat.instantText(slot.start, am, pm)?.time ?: slot.start
                val slotState = when {
                    state.person.start == slot.start -> SlotState.Selected
                    slot.available -> SlotState.Available
                    else -> SlotState.Full
                }
                AppTimeSlotChip(
                    time = label,
                    state = slotState,
                    onClick = { onAction(UiAction.OnSlotSelect(slot.start)) },
                    fullLabel = full,
                )
            }
        }
    }
}

/** Week starts on Saturday in Jordan (BUSINESS_DOMAIN `DayOfWeek`). */
private val WEEK = listOf(
    DayOfWeek.SATURDAY, DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY,
)
private const val DAY_LABEL_LENGTH = 3
private const val SHIMMER_ROWS = 3
