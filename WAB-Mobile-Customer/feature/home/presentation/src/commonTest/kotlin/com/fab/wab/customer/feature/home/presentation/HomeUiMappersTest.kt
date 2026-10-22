package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.feature.home.presentation.screen.distanceText
import kotlin.test.Test
import kotlin.test.assertEquals

/** Distance text of the design salon cards ("0.8 km", "2.4 km"). */
class HomeUiMappersTest {
    @Test
    fun distance_has_one_decimal() {
        assertEquals("0.8", distanceText(0.8))
        assertEquals("2.4", distanceText(2.44))
        assertEquals("2.5", distanceText(2.45))
        assertEquals("10.0", distanceText(10.0))
    }

    @Test
    fun distance_is_never_negative() {
        assertEquals("0.0", distanceText(-1.2))
    }
}
