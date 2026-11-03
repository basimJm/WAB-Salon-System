package com.fab.wab.merchant.feature.bookings.domain

import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRules
import com.fab.wab.merchant.feature.bookings.domain.model.SalonServiceOption
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class NewBookingRulesTest {
    private val cut = SalonServiceOption("s1", "Cut", "18.000", 45, false)
    private val color = SalonServiceOption("s2", "Color", "32.5", 90, false)

    @Test
    fun slotStartIsTheAmmanLocalTimeInUtc() {
        val start = NewBookingRules.slotStart(LocalDate(2026, 11, 5), 9 * 60 + 15, TimeZone.of("Asia/Amman"))
        assertEquals("2026-11-05T06:15:00Z", start.toString())
    }

    @Test
    fun slotsAreEveryFifteenMinutesAndTodayDropsPastOnes() {
        val all = NewBookingRules.slotMinutes(null)
        assertEquals(96, all.size)
        assertTrue(all.all { it % NewBookingRules.SLOT_STEP_MINUTES == 0 })
        val later = NewBookingRules.slotMinutes(nowMinute = 600)
        assertEquals(615, later.first())
        assertEquals("09:05", NewBookingRules.hhmm(545))
    }

    @Test
    fun totalsSumDurationsAndIntegerFils() {
        assertEquals(135, NewBookingRules.totalMinutes(listOf(cut, color)))
        assertEquals(50_500L, NewBookingRules.totalFils(listOf(cut, color)))
        assertEquals(12_050L, NewBookingRules.filsOf("12.05"))
        assertNull(NewBookingRules.filsOf("12.0505"))
        assertNull(NewBookingRules.filsOf("abc"))
        assertEquals(0L, NewBookingRules.totalFils(listOf(cut.copy(price = "free"))))
    }
}
