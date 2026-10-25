package com.fab.wab.merchant.app.deeplink

import com.fab.wab.merchant.core.common.DeepLink
import com.fab.wab.merchant.core.common.DeepLinks
import com.fab.wab.merchant.core.domain.session.LaunchRoute
import com.fab.wab.merchant.core.navigation.route.Screen
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

private const val WEB = "https://merchant.example.test"

/** MER-053 (PRD §4.5): `/register` from the customer app, booking links from notifications. */
class MerchantDeepLinksTest {
    private fun link(path: String): DeepLink = requireNotNull(DeepLinks.parse("$WEB/$path", WEB))

    @Test
    fun registerOpensTheRegistrationLoginForAGuestOnly() {
        assertEquals(Screen.Login(register = true), deepLinkTarget(link("register"), LaunchRoute.LOGIN))
        assertEquals(Screen.Login(register = true), deepLinkTarget(link("register?ref=customer-app"), LaunchRoute.LOGIN))
        assertNull(deepLinkTarget(link("register"), LaunchRoute.HOME))
        assertNull(deepLinkTarget(link("register"), LaunchRoute.APPLICATION_STATUS))
    }

    @Test
    fun bookingLinksOpenTheBookingOnHomeAndUnknownPathsNothing() {
        assertEquals(Screen.BookingDetails("b1"), deepLinkTarget(link("bookings/b1"), LaunchRoute.HOME))
        assertNull(deepLinkTarget(link("bookings/b1"), LaunchRoute.LOGIN))
        assertNull(deepLinkTarget(link("bookings"), LaunchRoute.HOME))
        assertNull(deepLinkTarget(link("salons/s1"), LaunchRoute.HOME))
    }
}
