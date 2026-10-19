package com.fab.wab.customer.core.ui.external

import kotlin.test.Test
import kotlin.test.assertEquals

class ExternalLinksTest {
    @Test
    fun whatsAppLinkStripsEverythingButDigits() {
        assertEquals("https://wa.me/962791234567", ExternalLinks.whatsApp("+962 79 123 4567"))
        assertEquals("tel:+962791234567", ExternalLinks.tel(" +962791234567 "))
    }
}
