package com.fab.wab.customer.core.domain.locations

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LocationsTest {

    private val jordan = Country("JO", "الأردن", "+962", null, "^7[789]\\d{7}$")
    private val saudi = Country("SA", "السعودية", "+966", null, "^5\\d{8}$")

    @Test
    fun defaultCountryIsJordanWhenPresentElseTheFirst() {
        assertEquals(jordan, listOf(saudi, jordan).defaultCountry())
        assertEquals(saudi, listOf(saudi).defaultCountry())
        assertNull(emptyList<Country>().defaultCountry())
        assertEquals(jordan, listOf(saudi, jordan).defaultCountry(code = "jo"))
    }
}
