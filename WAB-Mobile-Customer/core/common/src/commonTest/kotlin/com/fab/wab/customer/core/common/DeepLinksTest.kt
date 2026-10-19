package com.fab.wab.customer.core.common

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class DeepLinksTest {
    @Test
    fun buildsTheSalonLinkWithoutDoubleSlashes() {
        assertEquals("https://example.invalid/salon/s1", DeepLinks.salon("https://example.invalid/", " s1 "))
        assertEquals("https://example.invalid/salon/s1", DeepLinks.salon("https://example.invalid", "s1"))
        assertEquals("https://example.invalid/merchants/register", DeepLinks.merchantRegistration("https://example.invalid/"))
        assertEquals("example.invalid", DeepLinks.host("https://example.invalid/"))
    }

    @Test
    fun parsesSalonLinksAndRejectsTheRest() {
        assertEquals(DeepLink.Salon("s1"), DeepLinks.parse("https://Example.invalid/salon/s1?utm=x#top", "https://example.invalid"))
        assertEquals(DeepLink.Salon("s1"), DeepLinks.parse("https://any.host/salon/s1"))
        assertNull(DeepLinks.parse("https://other.invalid/salon/s1", "https://example.invalid"))
        assertNull(DeepLinks.parse("https://example.invalid/salon", "https://example.invalid"))
        assertNull(DeepLinks.parse("https://example.invalid/salons/s1/extra", "https://example.invalid"))
        assertNull(DeepLinks.parse("not a url"))
    }
}
