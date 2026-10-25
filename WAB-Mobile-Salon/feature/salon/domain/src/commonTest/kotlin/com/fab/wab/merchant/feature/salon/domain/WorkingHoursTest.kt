package com.fab.wab.merchant.feature.salon.domain

import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class WorkingHoursTest {

    @Test
    fun dayRulesFifteenMinuteStepsAndCloseAfterOpen() {
        assertTrue(DaySchedule(DayOfWeek.SATURDAY, false, 540, 1_260).isValid)
        assertFalse(DaySchedule(DayOfWeek.SATURDAY, false, 600, 600).isValid)
        assertFalse(DaySchedule(DayOfWeek.SATURDAY, false, 545, 1_260).isValid)
        assertTrue(DaySchedule(DayOfWeek.FRIDAY, true, 600, 0).isValid)
        assertEquals(HoursLimits.MINUTES_PER_DAY, CLOSE_STEPS.last())
        assertEquals(0, TIME_STEPS.first())
    }

    @Test
    fun weekIsSaturdayFirstAndCopyKeepsDaysOff() {
        val week = normalizeWeek(listOf(DaySchedule(DayOfWeek.MONDAY, false, 600, 1_200)))
        assertEquals(SALON_WEEK, week.map { it.day })
        assertTrue(week.first { it.day == DayOfWeek.FRIDAY }.isOff)
        val mixed = week.map { if (it.day == DayOfWeek.SUNDAY) it.copy(isOff = false) else it }
        val copied = mixed.copyHoursFrom(DaySchedule(DayOfWeek.MONDAY, false, 660, 1_320))
        assertEquals(660, copied.first { it.day == DayOfWeek.SUNDAY }.openMinute)
        assertTrue(copied.first { it.day == DayOfWeek.FRIDAY }.isOff)
    }

    @Test
    fun closureRules() {
        val today = LocalDate(2026, 10, 24)
        assertTrue(closureValid(today, today, "Eid", today))
        assertFalse(closureValid(LocalDate(2026, 10, 23), today, "Eid", today))
        assertFalse(closureValid(LocalDate(2026, 10, 26), LocalDate(2026, 10, 25), "Eid", today))
        assertFalse(closureValid(today, today, " ", today))
    }
}
