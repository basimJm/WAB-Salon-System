package com.fab.wab.customer.designsystem

import com.fab.wab.customer.designsystem.components.domain.firstNameOf
import com.fab.wab.customer.designsystem.components.domain.hoursLine
import com.fab.wab.customer.designsystem.components.domain.ratingValueText
import kotlin.test.Test
import kotlin.test.assertEquals

class DomainCardsTest {

    @Test
    fun ratingValueKeepsOneDecimalAndClamps() {
        assertEquals("4.5", ratingValueText(4.5f))
        assertEquals("4.0", ratingValueText(4f))
        assertEquals("3.7", ratingValueText(3.76f))
        assertEquals("0.0", ratingValueText(-1f))
        assertEquals("5.0", ratingValueText(9f))
    }

    @Test
    fun hoursLineSaysClosedTodayOnlyWithoutHoursToday() {
        fun line(isOpen: Boolean, hours: String?) = hoursLine(isOpen, hours, "Open", "Closed today", " · ", "Closed")
        assertEquals("Open · 8:00 AM – 4:00 PM", line(true, "8:00 AM – 4:00 PM"))
        // E2E (CUS-093): at 1 AM a salon that opens at 8 AM was labelled "Closed today".
        assertEquals("Closed · 8:00 AM – 4:00 PM", line(false, "8:00 AM – 4:00 PM"))
        assertEquals("Closed today", line(false, null))
        assertEquals("Closed today", line(true, null))
        assertEquals("Closed today", line(true, " "))
    }

    @Test
    fun firstNameTakesTheFirstWordInAnyLanguage() {
        assertEquals("Sara", firstNameOf("Sara Al-Ahmad"))
        assertEquals("سارة", firstNameOf("  سارة   الأحمد "))
        assertEquals("Mono", firstNameOf("Mono"))
        assertEquals("", firstNameOf("   "))
    }
}
