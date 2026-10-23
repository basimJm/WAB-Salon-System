package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.common.TimeFormat
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.designsystem.components.calendar.AppCalendarDayView
import com.fab.wab.merchant.designsystem.components.calendar.AppCalendarHeader
import com.fab.wab.merchant.designsystem.components.calendar.AppCalendarLegend
import com.fab.wab.merchant.designsystem.components.calendar.AppCalendarWeekView
import com.fab.wab.merchant.designsystem.components.calendar.CalendarEmptyUi
import com.fab.wab.merchant.designsystem.components.calendar.CalendarHeaderAction
import com.fab.wab.merchant.designsystem.components.calendar.CalendarMode
import com.fab.wab.merchant.designsystem.components.calendar.MINUTES_PER_HOUR
import com.fab.wab.merchant.designsystem.components.calendar.TimeWindow
import com.fab.wab.merchant.designsystem.components.calendar.WeekStripDayUi
import com.fab.wab.merchant.designsystem.components.calendar.weekOf
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.format.dateTimeText
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.resources.time_am
import com.fab.wab.merchant.designsystem.resources.time_pm
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.CalendarTexts
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.dayColumns
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.localDate
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.minuteOn
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.weekColumns
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.windowFor
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_closed_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_closed_label
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_closed_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_empty_body
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_empty_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_month
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_title
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_week_day
import com.fab.wab.merchant.feature.bookings.presentation.resources.calendar_range_separator
import org.jetbrains.compose.resources.stringResource
import kotlinx.datetime.LocalDate
import kotlin.time.Instant
import com.fab.wab.merchant.designsystem.resources.Res as DesignRes

/** Statuses the calendar draws (server `CALENDAR_STATUSES`). */
private val LEGEND = listOf(BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW)
private const val HOUR_TEXT_PAD = 2
private const val ZERO = '0'
private const val ON_THE_HOUR = ":00"

/** PRD M11 (design 04): read-only day / week calendar, staff filter, tap → M09. */
@Composable
fun CalendarScreen(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.SCREEN_CALENDAR)
    AppScreen(modifier = modifier, scrollsUnderTabBar = true) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            AppCalendarHeader(
                title = stringResource(Res.string.calendar_title),
                monthLabel = stringResource(Res.string.calendar_month, monthName(state.date.month.ordinal), state.date.year),
                selectedDate = state.date,
                mode = state.mode,
                strip = strip(state),
                onAction = { onAction(it.toUiAction()) },
                modifier = Modifier.padding(horizontal = AppTheme.spacing.space16, vertical = AppTheme.spacing.space12),
                filterCount = if (state.canFilter) state.staffFilter.size else null,
            )
            AppCalendarLegend(LEGEND)
            Box(modifier = Modifier.weight(1f)) { CalendarBody(state, onAction) }
        }
    }
    if (state.filterOpen) CalendarFilterSheet(state, onAction)
}

@Composable
private fun CalendarBody(state: UiState, onAction: (UiAction) -> Unit) {
    when {
        state.loading && state.entries.isEmpty() -> Box(
            Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) { AppLoadingIndicator() }
        state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
        else -> {
            val texts = CalendarTexts(timeRange = rangeText(), closed = stringResource(Res.string.calendar_closed_label))
            val days = state.days
            val columns = if (state.mode == CalendarMode.DAY) {
                dayColumns(state.date, state.entries, state.staff, state.staffFilter, state.own, state.hours, texts)
            } else {
                weekColumns(days, days.map { weekDayTitle(it) }, state.entries, state.staffFilter, state.hours, texts)
            }
            val window = windowFor(days, state.hours, columns)
            val labels = hourLabels(window)
            val onSwipe = { forward: Boolean -> onAction(UiAction.OnPage(forward)) }
            if (state.mode == CalendarMode.DAY) {
                AppCalendarDayView(
                    columns = columns,
                    window = window,
                    hourLabels = labels,
                    onBlockClick = { onAction(UiAction.OnBlockClick(it)) },
                    onSwipe = onSwipe,
                    nowMinute = nowMinute(state),
                    empty = emptyOf(state, columns.all { it.blocks.isEmpty() }),
                )
            } else {
                AppCalendarWeekView(columns, window, labels, onDayClick = { onAction(UiAction.OnDayClick(it)) }, onSwipe = onSwipe)
            }
        }
    }
}

@Composable
private fun emptyOf(state: UiState, noBlocks: Boolean): CalendarEmptyUi? {
    if (!noBlocks) return null
    val closed = state.hours != null && state.hours.hoursOn(state.date) == null
    return if (closed) {
        CalendarEmptyUi(
            stringResource(Res.string.calendar_closed_title),
            state.hours.closureOn(state.date)?.reason ?: stringResource(Res.string.calendar_closed_body),
        )
    } else {
        CalendarEmptyUi(stringResource(Res.string.calendar_empty_title), stringResource(Res.string.calendar_empty_body))
    }
}

private fun nowMinute(state: UiState): Int? {
    if (state.nowMs <= 0) return null
    val now = Instant.fromEpochMilliseconds(state.nowMs)
    return now.minuteOn(state.date).takeIf { now.localDate() == state.date }
}

@Composable
private fun strip(state: UiState): List<WeekStripDayUi> {
    val withBookings = state.entries.map { it.start.localDate() }.toSet()
    return weekOf(state.date).map { day ->
        WeekStripDayUi(
            date = day,
            dayLabel = weekdayName(day.dayOfWeek.ordinal),
            selected = day == state.date,
            isToday = day == state.today,
            hasBookings = day in withBookings,
            isDayOff = state.hours != null && state.hours.hoursOn(day) == null,
        )
    }
}

@Composable
private fun weekDayTitle(day: LocalDate): String =
    stringResource(Res.string.calendar_week_day, weekdayName(day.dayOfWeek.ordinal), day.day)

@Composable
private fun rangeText(): (Instant, Instant) -> String {
    val separator = stringResource(Res.string.calendar_range_separator)
    val am = stringResource(DesignRes.string.time_am)
    val pm = stringResource(DesignRes.string.time_pm)
    return { start, end ->
        val from = TimeFormat.instantText(start.toString(), am, pm)?.time.orEmpty()
        val to = TimeFormat.instantText(end.toString(), am, pm)?.time.orEmpty()
        from + separator + to
    }
}

@Composable
private fun hourLabels(window: TimeWindow): List<String> {
    val am = stringResource(DesignRes.string.time_am)
    val pm = stringResource(DesignRes.string.time_pm)
    return window.hours.map { minute ->
        val hour = (minute / MINUTES_PER_HOUR).toString().padStart(HOUR_TEXT_PAD, ZERO)
        TimeFormat.to12Hour(hour + ON_THE_HOUR, am, pm).orEmpty()
    }
}

private fun CalendarHeaderAction.toUiAction(): UiAction = when (this) {
    is CalendarHeaderAction.ModeChanged -> UiAction.OnModeChange(mode)
    CalendarHeaderAction.Today -> UiAction.OnToday
    is CalendarHeaderAction.Page -> UiAction.OnPage(forward)
    is CalendarHeaderAction.DayPicked -> UiAction.OnDatePick(date)
    CalendarHeaderAction.Filter -> UiAction.OnFilterClick
}
