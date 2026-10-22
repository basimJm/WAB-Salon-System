package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.designsystem.components.calendar.CalendarBlockUi
import com.fab.wab.merchant.designsystem.components.calendar.CalendarColumnUi
import com.fab.wab.merchant.designsystem.components.calendar.CalendarMode
import com.fab.wab.merchant.designsystem.components.calendar.TimeWindow
import com.fab.wab.merchant.designsystem.components.calendar.calendarBlockStyle
import com.fab.wab.merchant.designsystem.components.calendar.pageDate
import com.fab.wab.merchant.designsystem.components.calendar.spanIn
import com.fab.wab.merchant.designsystem.components.calendar.weekOf
import com.fab.wab.merchant.designsystem.theme.LightColors
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CalendarTest {
    private fun block(start: Int, end: Int, status: BookingStatus = BookingStatus.APPROVED) =
        CalendarBlockUi("b$start", start, end, "Sara", "Cut", "", status)

    @Test
    fun windowCoversWorkingHoursAndEveryBlockOnWholeHours() {
        val columns = listOf(CalendarColumnUi("s1", "Rana", listOf(block(8 * 60 + 45, 9 * 60 + 30))), CalendarColumnUi("s2", "Hiba", listOf(block(21 * 60, 22 * 60 + 15))))
        val window = TimeWindow.covering(workStart = 9 * 60, workEnd = 21 * 60, columns = columns)
        assertEquals(TimeWindow(8 * 60, 23 * 60), window)
        assertEquals(15, window.hours.size)
        assertEquals(15f, window.lengthHours)
    }

    @Test
    fun spansUseQuarterHourResolutionAndClampToTheWindow() {
        val window = TimeWindow(9 * 60, 22 * 60)
        assertEquals(1.25f to 0.75f, spanIn(window, 10 * 60 + 15, 11 * 60))
        assertEquals(0f to 0.5f, spanIn(window, 8 * 60, 9 * 60 + 30))
        assertEquals(13f to 0f, spanIn(window, 23 * 60, 23 * 60 + 30))
    }

    @Test
    fun weekStartsOnSaturday() {
        val wednesday = LocalDate(2026, 10, 7)
        val week = weekOf(wednesday)
        assertEquals(LocalDate(2026, 10, 3), week.first())
        assertEquals(DayOfWeek.SATURDAY, week.first().dayOfWeek)
        assertEquals(LocalDate(2026, 10, 9), week.last())
        assertEquals(week, weekOf(LocalDate(2026, 10, 3)))
    }

    @Test
    fun pagingMovesByDayOrWeek() {
        val date = LocalDate(2026, 10, 7)
        assertEquals(LocalDate(2026, 10, 8), pageDate(date, CalendarMode.DAY, forward = true))
        assertEquals(LocalDate(2026, 9, 30), pageDate(date, CalendarMode.WEEK, forward = false))
    }

    @Test
    fun pendingIsDashedCompletedIsFadedAndHuesFollowStatus() {
        val pending = calendarBlockStyle(BookingStatus.PENDING, LightColors)
        assertTrue(pending.dashed)
        assertEquals(LightColors.card, pending.container)
        assertTrue(calendarBlockStyle(BookingStatus.COMPLETED, LightColors).faded)
        val approved = calendarBlockStyle(BookingStatus.APPROVED, LightColors)
        assertFalse(approved.dashed || approved.faded)
        assertEquals(LightColors.successContainer, approved.container)
        assertEquals(LightColors.dangerContainer, calendarBlockStyle(BookingStatus.NO_SHOW, LightColors).container)
    }
}
