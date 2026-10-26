package com.fab.wab.merchant.feature.auth.presentation

import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.model.toDisplay
import kotlin.test.Test
import kotlin.test.assertEquals

/** MER-073: "we sent a code to" shows the number grouped like the design (`+962 7 9123 4567`). */
class PhoneDisplayTest {

    @Test
    fun groupsTheNationalNumberAfterTheDialCode() {
        assertEquals("+962 7 9123 4567", PhoneNumber("JO", "791234567").toDisplay("+962"))
        assertEquals("+962 7 9123 4567", PhoneNumber("JO", " 791234567 ").toDisplay(" +962 "))
    }

    @Test
    fun shortNumbersAndAMissingDialCodeStayReadable() {
        assertEquals("+962 79123", PhoneNumber("JO", "79123").toDisplay("+962"))
        assertEquals("7 9123 4567", PhoneNumber("JO", "791234567").toDisplay(""))
    }
}
