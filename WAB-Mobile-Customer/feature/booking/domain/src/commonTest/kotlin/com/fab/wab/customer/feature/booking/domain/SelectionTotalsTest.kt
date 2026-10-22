package com.fab.wab.customer.feature.booking.domain

import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.feature.booking.domain.model.SelectionTotals
import com.fab.wab.customer.feature.booking.domain.model.filsToJod
import com.fab.wab.customer.feature.booking.domain.model.jodToFils
import com.fab.wab.customer.feature.booking.domain.model.selectionTotalsOf
import kotlin.test.Test
import kotlin.test.assertEquals

private fun service(id: String, price: String, minutes: Int) = SalonService(id, "c$id", id, null, null, price, minutes, emptyList())

class SelectionTotalsTest {
    @Test
    fun sumsPricesInFilsAndDurations() {
        val services = listOf(service("a", "12.5", 30), service("b", "7.250", 45), service("c", "100", 10))
        assertEquals(SelectionTotals(19_750, 75), selectionTotalsOf(services, setOf("a", "b")))
        assertEquals(SelectionTotals(0, 0), selectionTotalsOf(services, emptySet()))
        assertEquals("19.75", filsToJod(19_750))
        assertEquals("100", filsToJod(100_000))
        assertEquals(0, jodToFils("price"))
    }
}
