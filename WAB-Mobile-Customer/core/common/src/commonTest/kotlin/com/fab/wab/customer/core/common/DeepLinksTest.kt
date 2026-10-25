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

    @Test
    fun salonLinkMayPreselectABranch() {
        val base = "https://example.invalid"
        assertEquals(DeepLink.Salon("s1", "b2"), DeepLinks.parse("$base/salon/s1?utm=x&branchId=b2#top", base))
        assertEquals(DeepLink.Salon("s1", "b2"), DeepLinks.parse("$base/salon/s1?branchId=b2", base))
        assertEquals(DeepLink.Salon("s1", null), DeepLinks.parse("$base/salon/s1?branchId=", base))
        assertEquals(DeepLink.Salon("s1", null), DeepLinks.parse("$base/salon/s1?branch=b2", base))
    }
}
