package com.fab.wab.merchant.core.domain.location

import com.fab.wab.merchant.core.domain.model.LocationData
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ReverseGeocoderTest {
    @Test
    fun addressPartsAreTrimmedDeduplicatedAndJoinedPerDirection() {
        assertEquals("Rainbow St, Amman", addressLineOf(listOf(" Rainbow St ", null, "", "Amman", "Amman"), rtl = false))
        assertEquals("شارع الرينبو، عمّان", addressLineOf(listOf("شارع الرينبو", "عمّان"), rtl = true))
        assertNull(addressLineOf(listOf(null, " "), rtl = true))
    }

    @Test
    fun pointsWithinAMetreAreTheSame() {
        val a = MapDefaults.DEFAULT_CENTER
        assertTrue(a.isSamePointAs(LocationData(a.latitude + 0.000001, a.longitude)))
        assertFalse(a.isSamePointAs(LocationData(a.latitude + 0.001, a.longitude)))
    }
}
