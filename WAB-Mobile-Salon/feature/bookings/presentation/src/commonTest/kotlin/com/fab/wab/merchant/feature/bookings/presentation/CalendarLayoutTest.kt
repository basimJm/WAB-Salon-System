package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.designsystem.components.calendar.ShadeKind
import com.fab.wab.merchant.feature.bookings.domain.model.CalendarEntry
import com.fab.wab.merchant.feature.bookings.domain.model.ClosureSpan
import com.fab.wab.merchant.feature.bookings.domain.model.DayHours
import com.fab.wab.merchant.feature.bookings.domain.model.SalonHours
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.CalendarTexts
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.dayColumns
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.minuteOn
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.weekColumns
import com.fab.wab.merchant.feature.bookings.presentation.controller.calendar.windowFor
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.time.Instant

class CalendarLayoutTest {

    private val day = LocalDate(2026, 10, 24)
    private val texts = CalendarTexts(timeRange = { _, _ -> "t" }, closed = "Closed")
    private val hours = SalonHours(
        weekly = DayOfWeek.entries.associateWith { if (it == DayOfWeek.FRIDAY) null else DayHours(OPEN, CLOSE) },
        closures = listOf(ClosureSpan(LocalDate(2026, 10, 26), LocalDate(2026, 10, 26), "Maintenance")),
    )

    // 07:00Z = 10:00 in Amman (UTC+3).
    private fun entry(id: String, staff: String, start: String, end: String) = CalendarEntry(
        id, "WAB-$id", BookingStatus.APPROVED, staff, "Rana", false, Instant.parse(start), Instant.parse(end),
    )

    private val entries = listOf(
        entry("a", "s1", "2026-10-24T07:00:00Z", "2026-10-24T08:00:00Z"),
        entry("b", "s9", "2026-10-24T13:30:00Z", "2026-10-24T14:00:00Z"),
        entry("c", "s1", "2026-10-25T07:00:00Z", "2026-10-25T08:00:00Z"),
    )

    @Test
    fun minutesAreAmmanLocalAndClampAcrossMidnight() {
        assertEquals(TEN_AM, Instant.parse("2026-10-24T07:00:00Z").minuteOn(day))
        assertEquals(0, Instant.parse("2026-10-23T20:00:00Z").minuteOn(day))
        assertEquals(MINUTES_PER_DAY, Instant.parse("2026-10-24T22:00:00Z").minuteOn(day))
    }

    @Test
    fun dayColumnsPerStaffPlusUnknownStaffWithBookings() {
        val columns = dayColumns(day, entries, listOf(SARA, LINA), emptySet(), null, hours, texts)
        assertEquals(listOf("s1", "s2", "s9"), columns.map { it.id })
        assertEquals(listOf("a"), columns[0].blocks.map { it.id })
        assertEquals(TEN_AM, columns[0].blocks.single().startMinute)
        assertEquals(listOf(0 to OPEN, CLOSE to MINUTES_PER_DAY), columns[0].shades.map { it.startMinute to it.endMinute })
    }

    @Test
    fun filterAndOwnColumn() {
        assertEquals(listOf("s2"), dayColumns(day, entries, listOf(SARA, LINA), setOf("s2"), null, hours, texts).map { it.id })
        val own = dayColumns(day, entries, emptyList(), emptySet(), StaffRef("me", "Me"), hours, texts).single()
        assertEquals("Me", own.title)
        assertEquals(2, own.blocks.size)
    }

    @Test
    fun closedDaysAndClosuresAreShadedWholeDay() {
        val friday = LocalDate(2026, 10, 23)
        val shade = dayColumns(friday, entries, listOf(SARA), emptySet(), null, hours, texts).single().shades.single()
        assertEquals(ShadeKind.CLOSED, shade.kind)
        assertEquals("Closed", shade.label)
        val closure = dayColumns(LocalDate(2026, 10, 26), entries, listOf(SARA), emptySet(), null, hours, texts).single().shades.single()
        assertEquals("Maintenance", closure.label)
    }

    @Test
    fun weekColumnsAndWindow() {
        val days = listOf(day, LocalDate(2026, 10, 25))
        val week = weekColumns(days, listOf("Sat 24", "Sun 25"), entries, setOf("s1"), hours, texts)
        assertEquals(listOf("2026-10-24", "2026-10-25"), week.map { it.id })
        assertEquals(listOf(listOf("a"), listOf("c")), week.map { col -> col.blocks.map { it.id } })
        val window = windowFor(listOf(day), hours, dayColumns(day, entries, listOf(SARA), emptySet(), null, hours, texts))
        assertEquals(OPEN, window.startMinute)
        assertEquals(LATE_END, window.endMinute)
    }

    private companion object {
        const val OPEN = 540
        const val CLOSE = 1_020
        const val TEN_AM = 600
        const val MINUTES_PER_DAY = 1_440

        // "b" ends at 17:00 local → the window covers the salon's 17:00 close exactly.
        const val LATE_END = 1_020
    }
}
