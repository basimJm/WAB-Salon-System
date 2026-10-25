package com.fab.wab.merchant.feature.insights.domain

import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class StatisticsTest {

    @Test
    fun presetsStartOnSaturdayAndTheFirstOfTheMonth() {
        val wednesday = LocalDate(2026, 10, 28)
        assertEquals(wednesday to wednesday, StatsPeriod.TODAY.dates(wednesday))
        assertEquals(LocalDate(2026, 10, 24) to wednesday, StatsPeriod.WEEK.dates(wednesday))
        val saturday = LocalDate(2026, 10, 24)
        assertEquals(saturday to saturday, StatsPeriod.WEEK.dates(saturday))
        val friday = LocalDate(2026, 10, 30)
        assertEquals(saturday to friday, StatsPeriod.WEEK.dates(friday))
        assertEquals(LocalDate(2026, 10, 1) to wednesday, StatsPeriod.MONTH.dates(wednesday))
        assertNull(StatsPeriod.CUSTOM.dates(wednesday))
    }

    @Test
    fun customRangesAreOrderedAndCappedAt92Days() {
        val from = LocalDate(2026, 1, 1)
        assertEquals(from to from, clampRange(from, LocalDate(2025, 12, 1)))
        assertEquals(from to LocalDate(2026, 4, 2), clampRange(from, LocalDate(2026, 12, 31)))
        assertEquals(from to LocalDate(2026, 4, 2), clampRange(from, LocalDate(2026, 4, 2)))
        assertEquals(from to LocalDate(2026, 3, 1), clampRange(from, LocalDate(2026, 3, 1)))
    }

    @Test
    fun barSharesFollowTheBusiestDay() {
        assertEquals(listOf(0.5f, 1f, 0f), barShares(listOf(2.0, 4.0, 0.0)))
        assertEquals(listOf(0f, 0f), barShares(listOf(0.0, 0.0)))
        assertEquals(emptyList(), barShares(emptyList()))
    }
}
