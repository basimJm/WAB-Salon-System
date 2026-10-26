package com.fab.wab.customer.feature.salons.presentation

import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.feature.salons.presentation.navigation.FilterSheetRequest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

/** CUS-092: a chip removed in S04 must not come back when S05 is reopened (fresh sheet view model per opening). */
class FilterSheetRequestTest {

    @Test
    fun everyOpeningGetsANewKeyEvenAfterTheSheetClosed() {
        val first = FilterSheetRequest.next(lastKey = 0, filters = SalonFilters())
        // The sheet closed (request dropped); the next opening continues from the last key, not from 0.
        val second = FilterSheetRequest.next(lastKey = first.key, filters = SalonFilters())
        val third = FilterSheetRequest.next(lastKey = second.key, filters = SalonFilters())

        assertNotEquals(first.key, second.key)
        assertNotEquals(second.key, third.key)
        assertEquals(listOf(1, 2, 3), listOf(first.key, second.key, third.key))
    }

    @Test
    fun theRequestCarriesTheActiveFiltersOfThatOpening() {
        val active = SalonFilters(minRating = 3)

        assertEquals(active, FilterSheetRequest.next(lastKey = 4, filters = active).filters)
    }
}
