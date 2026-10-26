package com.fab.wab.customer.feature.salon.presentation

import com.fab.wab.customer.core.domain.salon.Closure
import com.fab.wab.customer.feature.salon.presentation.screen.ClosureDates
import com.fab.wab.customer.feature.salon.presentation.screen.closureDatesOf
import kotlin.test.Test
import kotlin.test.assertEquals

/** CUS-092: the local stack's one-day closure read "Closed 2026-11-14 – 2026-11-14". */
class ClosureDatesTest {

    @Test
    fun oneDayClosureShowsASingleFormattedDate() {
        assertEquals(ClosureDates("14/11/2026", null), closureDatesOf(Closure("2026-11-14", "2026-11-14", "Training")))
    }

    @Test
    fun severalDaysShowAFormattedRange() {
        assertEquals(
            ClosureDates("10/06/2027", "12/06/2027"),
            closureDatesOf(Closure("2027-06-10T00:00:00.000Z", "2027-06-12T00:00:00.000Z", "Eid")),
        )
    }

    @Test
    fun nonIsoValuesAreShownAsGiven() {
        assertEquals(ClosureDates("soon", "later"), closureDatesOf(Closure("soon", "later", "Works")))
    }
}
