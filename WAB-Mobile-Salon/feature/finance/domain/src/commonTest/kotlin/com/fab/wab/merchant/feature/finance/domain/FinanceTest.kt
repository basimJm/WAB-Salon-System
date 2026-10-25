package com.fab.wab.merchant.feature.finance.domain

import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class FinanceTest {

    @Test
    fun presetsCoverTheMonthQuarterAndYear() {
        val today = LocalDate(2026, 10, 24)
        assertEquals(LocalDate(2026, 10, 1) to today, FinanceRange.THIS_MONTH.dates(today))
        assertEquals(LocalDate(2026, 8, 1) to today, FinanceRange.LAST_3_MONTHS.dates(today))
        assertEquals(LocalDate(2026, 1, 1) to today, FinanceRange.THIS_YEAR.dates(today))
        assertEquals(LocalDate(2025, 11, 1), FinanceRange.LAST_3_MONTHS.dates(LocalDate(2026, 1, 5))?.first)
        assertNull(FinanceRange.CUSTOM.dates(today))
    }
}
