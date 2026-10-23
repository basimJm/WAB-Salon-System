package com.fab.wab.merchant.designsystem.components.calendar

import androidx.compose.runtime.Immutable
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus
import kotlinx.datetime.plus

/** A booking on the calendar (PRD M11); minutes are local salon time (Asia/Amman) from midnight. */
@Immutable
data class CalendarBlockUi(
    val id: String,
    val startMinute: Int,
    val endMinute: Int,
    val customerName: String,
    val servicesText: String,
    val timeText: String,
    val status: BookingStatus,
    val isBride: Boolean = false,
)

/** Shaded span: outside working hours / closure, or a staff leave (amber). */
enum class ShadeKind { CLOSED, LEAVE }

@Immutable
data class CalendarShadeUi(val startMinute: Int, val endMinute: Int, val kind: ShadeKind, val label: String? = null)

/** One column: a staff member in the day view, a date in the week view. */
@Immutable
data class CalendarColumnUi(
    val id: String,
    val title: String,
    val blocks: List<CalendarBlockUi>,
    val shades: List<CalendarShadeUi> = emptyList(),
    val tag: String? = null,
)

/** Visible time range, snapped to whole hours. */
@Immutable
data class TimeWindow(val startMinute: Int, val endMinute: Int) {
    val hours: List<Int> get() = (startMinute until endMinute step MINUTES_PER_HOUR).toList()
    val lengthHours: Float get() = (endMinute - startMinute).toFloat() / MINUTES_PER_HOUR

    /** Hours from the window start to [minute], clamped into the window. */
    fun hoursFromStart(minute: Int): Float = (minute.coerceIn(startMinute, endMinute) - startMinute).toFloat() / MINUTES_PER_HOUR

    companion object {
        /** Working hours widened to every block and snapped outward to whole hours (the grid never cuts a booking). */
        fun covering(workStart: Int, workEnd: Int, columns: List<CalendarColumnUi>): TimeWindow {
            val blocks = columns.flatMap { it.blocks }
            val start = (listOf(workStart) + blocks.map { it.startMinute }).min()
            val end = (listOf(workEnd) + blocks.map { it.endMinute }).max()
            val snappedStart = (start / MINUTES_PER_HOUR) * MINUTES_PER_HOUR
            val snappedEnd = ((end + MINUTES_PER_HOUR - 1) / MINUTES_PER_HOUR) * MINUTES_PER_HOUR
            return TimeWindow(
                snappedStart.coerceAtLeast(0),
                snappedEnd.coerceAtMost(MINUTES_PER_DAY).coerceAtLeast(snappedStart + MINUTES_PER_HOUR),
            )
        }
    }
}

/** Top offset and height (in hours) of a span inside [window]; spans outside the window collapse to zero height. */
fun spanIn(window: TimeWindow, startMinute: Int, endMinute: Int): Pair<Float, Float> {
    val top = window.hoursFromStart(startMinute)
    val bottom = window.hoursFromStart(endMinute)
    return top to (bottom - top).coerceAtLeast(0f)
}

/** The 7 days of the salon week containing [date] (Saturday first, as in Jordan and design 04). */
fun weekOf(date: LocalDate, firstDay: DayOfWeek = DayOfWeek.SATURDAY): List<LocalDate> {
    val back = (date.dayOfWeek.ordinal - firstDay.ordinal + DAYS_PER_WEEK) % DAYS_PER_WEEK
    val start = date.minus(DatePeriod(days = back))
    return (0 until DAYS_PER_WEEK).map { start.plus(DatePeriod(days = it)) }
}

/** Day view pages by one day, week view by seven ([forward] = next). */
fun pageDate(date: LocalDate, mode: CalendarMode, forward: Boolean): LocalDate {
    val days = if (mode == CalendarMode.DAY) 1 else DAYS_PER_WEEK
    return if (forward) date.plus(DatePeriod(days = days)) else date.minus(DatePeriod(days = days))
}

enum class CalendarMode { DAY, WEEK }

/** One chip of the week strip (design 04 `strip`). */
@Immutable
data class WeekStripDayUi(
    val date: LocalDate,
    val dayLabel: String,
    val selected: Boolean,
    val isToday: Boolean,
    val hasBookings: Boolean,
    val isDayOff: Boolean,
)

const val MINUTES_PER_HOUR = 60
private const val MINUTES_PER_DAY = 1_440
private const val DAYS_PER_WEEK = 7
