package com.fab.wab.customer.feature.booking.domain

import com.fab.wab.customer.core.domain.salon.Closure
import com.fab.wab.customer.core.domain.salon.DaySchedule
import com.fab.wab.customer.core.domain.salon.DayOfWeek
import com.fab.wab.customer.feature.booking.domain.model.calendarDaysOf
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CalendarDaysTest {
    @Test
    fun disablesWeeklyDaysOffAndClosuresWithinNinetyDays() {
        val today = LocalDate.parse("2026-10-19") // a Monday
        val schedule = listOf(DaySchedule(DayOfWeek.FRI, isOff = true, hours = null))
        val closures = listOf(Closure("2026-10-21", "2026-10-22T00:00:00Z", "Eid"))
        val days = calendarDaysOf(today, 90, schedule, closures)
        assertEquals(91, days.size)
        assertTrue(days.first { it.date == today }.enabled)
        assertFalse(days.first { it.date == LocalDate.parse("2026-10-23") }.enabled)
        assertFalse(days.first { it.date == LocalDate.parse("2026-10-21") }.enabled)
        assertFalse(days.first { it.date == LocalDate.parse("2026-10-22") }.enabled)
        assertTrue(days.first { it.date == LocalDate.parse("2026-10-20") }.enabled)
        assertEquals(LocalDate.parse("2027-01-17"), days.last().date)
    }
}
