package com.fab.wab.customer.core.common

import kotlin.test.Test
import kotlin.test.assertEquals

class DeepLinksTest {
    @Test
    fun salonLinkJoinsTheWebOriginAndId() {
        assertEquals("https://example.invalid/salons/s1", DeepLinks.salon("https://example.invalid/", " s1 "))
        assertEquals("https://example.invalid/salons/s1", DeepLinks.salon("https://example.invalid", "s1"))
    }
}
