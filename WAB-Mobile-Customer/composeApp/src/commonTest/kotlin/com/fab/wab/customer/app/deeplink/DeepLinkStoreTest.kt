package com.fab.wab.customer.app.deeplink

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.common.DeepLink
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DeepLinkStoreTest {
    private val store = DeepLinkStore(AppEnvironment("dev", "https://api.example", "https://web.example", "1.0.0", 1, isDebug = true))

    @Test
    fun keepsOnlyLinksOfThePlatformHostUntilConsumed() {
        assertFalse(store.publish("https://other.example/salon/s1"))
        assertFalse(store.publish(null))
        assertNull(store.link.value)
        assertTrue(store.publish("https://web.example/salon/s1"))
        assertEquals(DeepLink.Salon("s1"), store.link.value)
        store.consume(DeepLink.Salon("other"))
        assertEquals(DeepLink.Salon("s1"), store.link.value, "consuming a different link keeps the pending one")
        store.consume(DeepLink.Salon("s1"))
        assertNull(store.link.value)
    }
}
