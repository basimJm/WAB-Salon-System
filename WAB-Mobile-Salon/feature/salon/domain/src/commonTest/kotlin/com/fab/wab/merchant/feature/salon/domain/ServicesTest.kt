package com.fab.wab.merchant.feature.salon.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ServicesTest {

    private val valid = ServiceDraft(price = "12.5", durationMinutes = "45")

    @Test
    fun validDraftAndArabicDigits() {
        assertTrue(serviceErrors(valid).isEmpty())
        assertEquals("12.50", normalizeNumber("١٢٫٥٠"))
        assertTrue(serviceErrors(ServiceDraft(price = "١٢٫٥", durationMinutes = "٣٠")).isEmpty())
    }

    @Test
    fun priceDurationDescriptionAndMediaLimits() {
        assertEquals(setOf(ServiceField.PRICE), serviceErrors(valid.copy(price = "0")))
        assertEquals(setOf(ServiceField.PRICE), serviceErrors(valid.copy(price = "1.234")))
        assertEquals(setOf(ServiceField.PRICE), serviceErrors(valid.copy(price = "")))
        assertEquals(setOf(ServiceField.DURATION), serviceErrors(valid.copy(durationMinutes = "42")))
        assertEquals(setOf(ServiceField.DURATION), serviceErrors(valid.copy(durationMinutes = "0")))
        assertEquals(setOf(ServiceField.DURATION), serviceErrors(valid.copy(durationMinutes = "1445")))
        assertEquals(
            setOf(ServiceField.DESCRIPTION),
            serviceErrors(valid.copy(description = "d".repeat(ServiceLimits.DESCRIPTION_MAX + 1))),
        )
        assertEquals(setOf(ServiceField.MEDIA), serviceErrors(valid.copy(mediaKeys = List(ServiceLimits.MEDIA_MAX + 1) { "k$it" })))
    }

    @Test
    fun editingPriceAndSearch() {
        assertEquals("12.5", priceForEditing("12.500"))
        assertEquals("20", priceForEditing("20.000"))
        assertEquals("15", priceForEditing("15"))
        assertEquals(listOf("Hair cut"), listOf("Hair cut", "Nails").matching(" hair ") { it })
        assertEquals(2, listOf("Hair cut", "Nails").matching("") { it }.size)
    }
}
