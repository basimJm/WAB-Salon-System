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
    fun hoursLineShowsHoursOnlyWhenOpen() {
        assertEquals("Open · 8:00 AM – 4:00 PM", hoursLine(true, "8:00 AM – 4:00 PM", "Open", "Closed today", " · "))
        assertEquals("Closed today", hoursLine(false, "8:00 AM – 4:00 PM", "Open", "Closed today", " · "))
        assertEquals("Closed today", hoursLine(true, null, "Open", "Closed today", " · "))
        assertEquals("Closed today", hoursLine(true, " ", "Open", "Closed today", " · "))
    }

    @Test
    fun firstNameTakesTheFirstWordInAnyLanguage() {
        assertEquals("Sara", firstNameOf("Sara Al-Ahmad"))
        assertEquals("سارة", firstNameOf("  سارة   الأحمد "))
        assertEquals("Mono", firstNameOf("Mono"))
        assertEquals("", firstNameOf("   "))
    }
}
