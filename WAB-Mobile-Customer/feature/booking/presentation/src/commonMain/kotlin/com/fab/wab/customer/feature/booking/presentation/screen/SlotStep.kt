@file:Suppress("DEPRECATION") // kotlinx-datetime 0.7 deprecations on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.core.domain.salon.Closure
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.utils.brandBackground
import com.fab.wab.customer.designsystem.utils.brandBrush
import com.fab.wab.customer.feature.booking.domain.model.CalendarDay
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_closure_note
import com.fab.wab.customer.feature.booking.presentation.resources.booking_legend_closed
import com.fab.wab.customer.feature.booking.presentation.resources.booking_legend_selected
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_next
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_previous
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_year
import com.fab.wab.customer.feature.booking.presentation.resources.booking_pick_date_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_wk_fri
import com.fab.wab.customer.feature.booking.presentation.resources.booking_wk_mon
import com.fab.wab.customer.feature.booking.presentation.resources.booking_wk_sat
import com.fab.wab.customer.feature.booking.presentation.resources.booking_wk_sun
import com.fab.wab.customer.feature.booking.presentation.resources.booking_wk_thu
import com.fab.wab.customer.feature.booking.presentation.resources.booking_wk_tue
import com.fab.wab.customer.feature.booking.presentation.resources.booking_wk_wed
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import org.jetbrains.compose.resources.stringResource

/**
 * Step 2 (`st.s2`): title `mb 14`, calendar card (`border:1px solid var(--line);border-radius:20px;padding:14px`),
 * optional closure note `mt 10 12px danger`, then the times section once a date is chosen.
 */
@Composable
internal fun SlotStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val months = state.calendar.map { it.date.year to it.date.monthNumber }.distinct()
    val month = months.getOrNull(state.visibleMonth)
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = spacing.space20, top = spacing.space4, end = spacing.space20, bottom = spacing.space20),
    ) {
        StepTitle(text = stringResource(Res.string.booking_pick_date_title), modifier = Modifier.padding(bottom = spacing.space14))
        if (month != null) {
            MonthCalendar(state, month, months.lastIndex, onAction)
            state.salon?.upcomingClosures.orEmpty().filter { it.isIn(month) }.forEach { ClosureNote(it) }
        }
        if (state.selectedDate != null) SlotTimes(state, onAction, Modifier.padding(top = spacing.space20))
    }
}

@Composable
private fun MonthCalendar(state: UiState, month: Pair<Int, Int>, lastMonth: Int, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    val days = state.calendar.filter { it.date.year == month.first && it.date.monthNumber == month.second }
    val today = state.calendar.firstOrNull()?.date
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(AppTheme.sizes.hairline, colors.line, roundedShape(BookingDesignConstants.calendarRadius))
            .padding(spacing.space14),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = spacing.space10),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            MonthButton(
                icon = AppIcons.Back,
                label = stringResource(Res.string.booking_month_previous),
                enabled = state.visibleMonth > 0,
                onClick = { onAction(UiAction.OnMonthChange(-1)) },
            )
            AppText(
                text = stringResource(Res.string.booking_month_year, monthName(month.second), month.first),
                style = AppTheme.typography.titleMedium,
            )
            MonthButton(
                icon = AppIcons.Forward,
                label = stringResource(Res.string.booking_month_next),
                enabled = state.visibleMonth < lastMonth,
                onClick = { onAction(UiAction.OnMonthChange(1)) },
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(BookingDesignConstants.dayCellGap)) {
            WEEK.forEach { day ->
                AppText(
                    text = stringResource(day.headRes()),
                    modifier = Modifier.weight(1f).padding(vertical = spacing.space4),
                    style = AppTheme.typography.labelSmall,
                    color = colors.faint,
                    textAlign = TextAlign.Center,
                )
            }
        }
        val leading = days.firstOrNull()?.let { WEEK.indexOf(it.date.dayOfWeek) } ?: 0
        val cells: List<CalendarDay?> = List(leading) { null } + days
        cells.chunked(WEEK.size).forEach { week ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = BookingDesignConstants.dayCellGap),
                horizontalArrangement = Arrangement.spacedBy(BookingDesignConstants.dayCellGap),
            ) {
                week.forEach { day -> DayCell(day, state.selectedDate == day?.date, day?.date == today, onAction, Modifier.weight(1f)) }
                repeat(WEEK.size - week.size) { Box(Modifier.weight(1f)) }
            }
        }
        Legend(Modifier.padding(top = spacing.space10))
    }
}

/** Design `prevStyle` / `nextStyle`: `36px;border-radius:10px;background:var(--surface)`, `opacity:.35` when disabled. */
@Composable
private fun MonthButton(icon: ImageVector, label: String, enabled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val shape = roundedShape(BookingDesignConstants.monthButtonRadius)
    Box(
        modifier = modifier
            .size(BookingDesignConstants.monthButton)
            .alpha(if (enabled) 1f else BookingDesignConstants.MONTH_BUTTON_DISABLED_ALPHA)
            .clip(shape)
            .background(AppTheme.colors.surface)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = AppTheme.colors.ink, modifier = Modifier.size(AppTheme.sizes.icon))
    }
}

/**
 * Design `calDays`: `height:38px;border-radius:11px;font-size:13.5px`, weight 700 selected / 500 otherwise; gradient when
 * selected, `rgba(217,70,122,.12)` on closed days, `var(--soft)` on today; faint text when disabled.
 */
@Composable
private fun DayCell(day: CalendarDay?, selected: Boolean, isToday: Boolean, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = roundedShape(BookingDesignConstants.dayCellRadius)
    val cell = modifier.height(BookingDesignConstants.dayCellHeight)
    if (day == null) {
        Box(cell)
        return
    }
    val background = when {
        selected -> cell.brandBackground(brandBrush(), shape)
        !day.enabled -> cell.clip(shape).background(colors.dangerContainer)
        isToday -> cell.clip(shape).background(colors.soft)
        else -> cell.clip(shape)
    }
    Box(
        modifier = background.clickable(enabled = day.enabled, role = Role.Button) { onAction(UiAction.OnDateSelect(day.date)) },
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = day.date.dayOfMonth.toString(),
            style = AppTheme.typography.bodyMedium.copy(fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium),
            color = when {
                selected -> colors.onGradient
                day.enabled -> colors.ink
                else -> colors.faint
            },
        )
    }
}

/** Design legend: `gap:14px;font-size:11px;color:var(--muted)` with 10 dp squares (`radius 3px`). */
@Composable
private fun Legend(modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = roundedShape(BookingDesignConstants.legendRadius)
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(BookingDesignConstants.legendGap)) {
        LegendItem(stringResource(Res.string.booking_legend_selected), Modifier.brandBackground(brandBrush(), shape))
        LegendItem(stringResource(Res.string.booking_legend_closed), Modifier.background(colors.dangerContainer, shape))
    }
}

@Composable
private fun LegendItem(label: String, square: Modifier) {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4), verticalAlignment = Alignment.CenterVertically) {
        Box(square.size(BookingDesignConstants.legendSquare))
        AppText(text = label, style = AppTheme.typography.labelSmall, color = AppTheme.colors.muted)
    }
}

/** Design `closureNote`: `margin-top:10px;font-size:12px;color:#D9467A` with a 14 dp info icon, `gap:6px`. */
@Composable
private fun ClosureNote(closure: Closure) {
    val date = runCatching { LocalDate.parse(closure.from.take(ISO_DATE_LENGTH)) }.getOrNull() ?: return
    Row(
        modifier = Modifier.padding(top = AppTheme.spacing.space10),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            AppIcons.Info,
            contentDescription = null,
            tint = AppTheme.colors.danger,
            modifier = Modifier.size(BookingDesignConstants.closureIcon),
        )
        AppText(
            text = stringResource(Res.string.booking_closure_note, dayMonthText(date), closure.reason),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colors.danger,
        )
    }
}

private fun Closure.isIn(month: Pair<Int, Int>): Boolean {
    val date = runCatching { LocalDate.parse(from.take(ISO_DATE_LENGTH)) }.getOrNull() ?: return false
    return date.year == month.first && date.monthNumber == month.second
}

/** Design `t.wk`: one-/two-letter day heads, Saturday first (Jordan week). */
private fun DayOfWeek.headRes() = when (this) {
    DayOfWeek.SATURDAY -> Res.string.booking_wk_sat
    DayOfWeek.SUNDAY -> Res.string.booking_wk_sun
    DayOfWeek.MONDAY -> Res.string.booking_wk_mon
    DayOfWeek.TUESDAY -> Res.string.booking_wk_tue
    DayOfWeek.WEDNESDAY -> Res.string.booking_wk_wed
    DayOfWeek.THURSDAY -> Res.string.booking_wk_thu
    DayOfWeek.FRIDAY -> Res.string.booking_wk_fri
}

/** Week starts on Saturday in Jordan (BUSINESS_DOMAIN `DayOfWeek`). */
private val WEEK = listOf(
    DayOfWeek.SATURDAY, DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY,
)
private const val ISO_DATE_LENGTH = 10
