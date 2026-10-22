package com.fab.wab.customer.core.ui.external

import kotlin.test.Test
import kotlin.test.assertEquals

class ExternalLinksTest {
    @Test
    fun whatsAppLinkStripsEverythingButDigits() {
        assertEquals("https://wa.me/962791234567", ExternalLinks.whatsApp("+962 79 123 4567"))
        assertEquals("tel:+962791234567", ExternalLinks.tel(" +962791234567 "))
    }

    @Test
    fun queryEncodingKeepsUnreservedAndEncodesUtf8() {
        assertEquals("Glow%20Salon%20%26%20Spa", ExternalLinks.queryEncode("Glow Salon & Spa"))
        assertEquals("%D8%B5%D8%A7%D9%84%D9%88%D9%86", ExternalLinks.queryEncode("صالون"))
        assertEquals("a-b_c.d~e", ExternalLinks.queryEncode("a-b_c.d~e"))
    }
}
