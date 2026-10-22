package com.fab.wab.merchant.app.navigation

import com.fab.wab.merchant.core.domain.session.LaunchRoute
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.designsystem.components.navigation.MerchantTab
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class MerchantRootTabsTest {
    @Test
    fun routesStartAtTheirGraphAndHomeAtTheFirstAvailableTab() {
        assertEquals(Graph.Auth, LaunchRoute.LOGIN.startGraph(emptyList()))
        assertEquals(Graph.Onboarding, LaunchRoute.APPLICATION_STATUS.startGraph(emptyList()))
        assertEquals(Graph.Setup, LaunchRoute.SETUP_CHECKLIST.startGraph(emptyList()))
        assertEquals(Graph.Bookings, LaunchRoute.HOME.startGraph(listOf(MerchantTab.BOOKINGS, MerchantTab.MORE)))
    }

    @Test
    fun theTabOwningADestinationComesFromItsGraphRoute() {
        val bookingsRoute = Graph.Bookings::class.qualifiedName
        assertEquals(MerchantTab.BOOKINGS, tabForRoutes(listOf("details", bookingsRoute, null)))
        assertNull(tabForRoutes(listOf("login", Graph.Auth::class.qualifiedName)))
    }
}
