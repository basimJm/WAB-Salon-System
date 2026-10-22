package com.fab.wab.merchant.feature.team.domain

import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class StaffTest {

    private val salon = mapOf(DayOfWeek.SATURDAY to OpenHours(540, 1_260), DayOfWeek.FRIDAY to null)

    @Test
    fun customHoursStayInsideTheSalonDay() {
        assertTrue(StaffDay(DayOfWeek.SATURDAY).isValidWithin(salon[DayOfWeek.SATURDAY]))
        assertTrue(StaffDay(DayOfWeek.SATURDAY, 600, 900).isValidWithin(salon[DayOfWeek.SATURDAY]))
        assertFalse(StaffDay(DayOfWeek.SATURDAY, 480, 900).isValidWithin(salon[DayOfWeek.SATURDAY]))
        assertFalse(StaffDay(DayOfWeek.SATURDAY, 600, 905).isValidWithin(salon[DayOfWeek.SATURDAY]))
        assertFalse(StaffDay(DayOfWeek.SATURDAY, 900, 600).isValidWithin(salon[DayOfWeek.SATURDAY]))
        assertFalse(StaffDay(DayOfWeek.FRIDAY).isValidWithin(salon[DayOfWeek.FRIDAY]))
    }

    @Test
    fun draftAndLeaveRules() {
        assertTrue(staffErrors(StaffDraft(years = "5", workingDays = listOf(StaffDay(DayOfWeek.SATURDAY))), salon).isEmpty())
        assertEquals(
            setOf(StaffField.BIO, StaffField.YEARS, StaffField.DAYS),
            staffErrors(StaffDraft(bio = "b".repeat(StaffLimits.BIO_MAX + 1), years = "81", workingDays = listOf(StaffDay(DayOfWeek.FRIDAY))), salon),
        )
        val today = LocalDate(2026, 10, 24)
        assertTrue(leaveValid(today, LocalDate(2026, 10, 26), "", today))
        assertFalse(leaveValid(LocalDate(2026, 10, 23), today, "", today))
        assertFalse(leaveValid(today, today, "n".repeat(StaffLimits.NOTE_MAX + 1), today))
    }
}
