package com.fab.wab.customer.core.common

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TimeFormatTest {

    @Test
    fun formatsTwelveHourClockWithLabels() {
        assertEquals("4:05 PM", TimeFormat.to12Hour("16:05", "AM", "PM"))
        assertEquals("12:30 AM", TimeFormat.to12Hour("00:30", "AM", "PM"))
        assertEquals("12:00 PM", TimeFormat.to12Hour("12:00", "AM", "PM"))
        assertEquals("8:00 ص", TimeFormat.to12Hour("08:00", "ص", "م"))
    }

    @Test
    fun rejectsInvalidInput() {
        assertNull(TimeFormat.to12Hour("open", "AM", "PM"))
        assertNull(TimeFormat.to12Hour("24:00", "AM", "PM"))
        assertNull(TimeFormat.to12Hour("8:60", "AM", "PM"))
        assertNull(TimeFormat.range12Hour("08:00", "close", "AM", "PM", " – "))
    }

    @Test
    fun formatsIsoDates() {
        assertEquals("18/10/2026", TimeFormat.isoDateText("2026-10-18T10:00:00.000Z"))
        assertNull(TimeFormat.isoDateText("yesterday"))
    }

    @Test
    fun formatsARange() {
        assertEquals("8:00 AM – 4:00 PM", TimeFormat.range12Hour("08:00", "16:00", "AM", "PM", " – "))
    }
}
