package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.core.domain.salon.cardBranchCount
import com.fab.wab.customer.feature.home.presentation.screen.salonPlaceText
import kotlin.test.Test
import kotlin.test.assertEquals

/** Card place line: nearest branch area + "N branches" only for multi-branch salons (BUSINESS_DOMAIN §5.17). */
class BranchTextsTest {
    @Test
    fun singleBranchShowsTheAreaOnly() {
        assertEquals("Abdoun", salonPlaceText("Abdoun", null, SEPARATOR))
        assertEquals("", salonPlaceText(null, null, SEPARATOR))
    }

    @Test
    fun severalBranchesAppendTheCount() {
        assertEquals("Abdoun · 3 branches", salonPlaceText(" Abdoun ", "3 branches", SEPARATOR))
        assertEquals("3 branches", salonPlaceText("", "3 branches", SEPARATOR))
    }

    @Test
    fun serverCountIsAWholeNumberOfAtLeastOne() {
        assertEquals(3, cardBranchCount(3.0))
        assertEquals(1, cardBranchCount(0.0))
        assertEquals(1, cardBranchCount(-2.0))
    }

    private companion object {
        const val SEPARATOR = " · "
    }
}
