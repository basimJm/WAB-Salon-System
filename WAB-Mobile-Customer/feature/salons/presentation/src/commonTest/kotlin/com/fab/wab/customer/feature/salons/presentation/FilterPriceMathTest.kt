package com.fab.wab.customer.feature.salons.presentation

import com.fab.wab.customer.feature.salons.presentation.screen.PriceThumb
import com.fab.wab.customer.feature.salons.presentation.screen.movedSelection
import com.fab.wab.customer.feature.salons.presentation.screen.nearestThumb
import com.fab.wab.customer.feature.salons.presentation.screen.priceAtFraction
import com.fab.wab.customer.feature.salons.presentation.screen.priceFraction
import com.fab.wab.customer.feature.salons.presentation.screen.trackFraction
import kotlin.test.Test
import kotlin.test.assertEquals

/** Pure slider math of the S05 price range (design `slide()`). */
class FilterPriceMathTest {
    private val bounds = 5f..60f

    @Test
    fun fraction_and_value_round_trip_on_whole_jod() {
        assertEquals(0f, priceFraction(5f, bounds))
        assertEquals(1f, priceFraction(60f, bounds))
        assertEquals(5f, priceAtFraction(0f, bounds))
        assertEquals(60f, priceAtFraction(1f, bounds))
        assertEquals(33f, priceAtFraction(0.5f, bounds))
        assertEquals(0f, priceFraction(10f, 5f..5f))
    }

    @Test
    fun fractions_are_clamped() {
        assertEquals(0f, priceFraction(-3f, bounds))
        assertEquals(1f, priceFraction(99f, bounds))
        assertEquals(60f, priceAtFraction(2f, bounds))
    }

    @Test
    fun nearest_thumb_prefers_min_on_tie() {
        assertEquals(PriceThumb.Min, nearestThumb(12f, 10f..20f))
        assertEquals(PriceThumb.Min, nearestThumb(15f, 10f..20f))
        assertEquals(PriceThumb.Max, nearestThumb(18f, 10f..20f))
    }

    @Test
    fun thumbs_never_cross() {
        assertEquals(20f..20f, movedSelection(PriceThumb.Min, 30f, 10f..20f))
        assertEquals(10f..10f, movedSelection(PriceThumb.Max, 2f, 10f..20f))
        assertEquals(12f..20f, movedSelection(PriceThumb.Min, 12f, 10f..20f))
    }

    @Test
    fun track_fraction_mirrors_in_rtl() {
        assertEquals(0.25f, trackFraction(25f, 100f, rtl = false))
        assertEquals(0.75f, trackFraction(25f, 100f, rtl = true))
        assertEquals(0f, trackFraction(25f, 0f, rtl = false))
        assertEquals(1f, trackFraction(500f, 100f, rtl = false))
    }
}
