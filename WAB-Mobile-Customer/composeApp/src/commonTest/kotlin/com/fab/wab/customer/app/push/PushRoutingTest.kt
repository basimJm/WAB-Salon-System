package com.fab.wab.customer.app.push

import com.fab.wab.customer.core.notification.push.PushKeys
import com.fab.wab.customer.core.notification.push.PushNotification
import com.fab.wab.customer.core.notification.push.pushNotificationOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class PushRoutingTest {
    private val web = "https://web.example"

    @Test
    fun tapRoutesToTheSalonLinkThenNotificationsThenHome() {
        val plain = PushNotification("t", "b")
        assertEquals(PushTapDestination.Notifications, pushTapDestinationOf(plain, signedIn = true, webBaseUrl = web))
        assertEquals(PushTapDestination.Home, pushTapDestinationOf(plain, signedIn = false, webBaseUrl = web))
        val linked = PushNotification("t", "b", deepLink = "https://web.example/salon/s1")
        assertEquals(
            PushTapDestination.Link("https://web.example/salon/s1"),
            pushTapDestinationOf(linked, signedIn = false, webBaseUrl = web),
        )
        val foreign = PushNotification("t", "b", deepLink = "https://evil.example/salon/s1")
        assertEquals(PushTapDestination.Notifications, pushTapDestinationOf(foreign, signedIn = true, webBaseUrl = web))
    }

    @Test
    fun payloadBuildsFromNotificationFieldsOrDataAndDropsEmptyOnes() {
        val fromData = pushNotificationOf(mapOf(PushKeys.TITLE to "Hi", PushKeys.BODY to "There", PushKeys.DEEP_LINK to " "))
        assertEquals(
            PushNotification("Hi", "There", mapOf(PushKeys.TITLE to "Hi", PushKeys.BODY to "There", PushKeys.DEEP_LINK to " ")),
            fromData,
        )
        val shown = pushNotificationOf(mapOf(PushKeys.BOOKING_ID to "b1"), title = "Approved", body = "See details")
        assertEquals("Approved", shown?.title)
        assertEquals("b1", shown?.data?.get(PushKeys.BOOKING_ID))
        assertNull(pushNotificationOf(emptyMap()))
    }
}
