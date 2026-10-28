package com.fab.wab.merchant.app.navigation

import com.fab.wab.merchant.core.domain.session.LaunchRoute
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.designsystem.components.navigation.MerchantTab
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MerchantRootTabsTest {
    @Test
    fun routesStartAtTheirGraphAndHomeAtTheFirstAvailableTab() {
        assertEquals(Graph.Auth, LaunchRoute.LOGIN.startGraph(emptyList()))
        assertEquals(Graph.Onboarding, LaunchRoute.APPLICATION_STATUS.startGraph(emptyList()))
        assertEquals(Graph.Setup, LaunchRoute.SETUP_CHECKLIST.startGraph(emptyList()))
        assertEquals(Graph.Bookings, LaunchRoute.HOME.startGraph(listOf(MerchantTab.BOOKINGS, MerchantTab.MORE)))
        assertEquals(Graph.More, LaunchRoute.HOME.startGraph(emptyList()), "never an unregistered graph")
    }

    @Test
    fun homeTabIsRegisteredAndOpensFirstWhenPermitted() {
        assertTrue(MerchantTab.HOME in REGISTERED_TABS)
        assertEquals(Graph.Home, LaunchRoute.HOME.startGraph(listOf(MerchantTab.HOME, MerchantTab.BOOKINGS, MerchantTab.MORE)))
        assertEquals(Graph.Home, MerchantTab.HOME.graph())
    }

    @Test
    fun theBarShowsOnTabRootsOfTheHomeRouteOnly() {
        val tabs = listOf(MerchantTab.BOOKINGS, MerchantTab.SALON, MerchantTab.MORE)
        assertTrue(showsNavigation(LaunchRoute.HOME, onTabRoot = true, currentTab = MerchantTab.SALON, tabs = tabs))
        assertFalse(showsNavigation(LaunchRoute.HOME, onTabRoot = false, currentTab = MerchantTab.SALON, tabs = tabs), "detail screen")
        assertFalse(
            showsNavigation(LaunchRoute.APPLICATION_STATUS, onTabRoot = true, currentTab = MerchantTab.SALON, tabs = tabs),
            "pending salon",
        )
        assertFalse(showsNavigation(LaunchRoute.HOME, onTabRoot = true, currentTab = null, tabs = tabs))
    }

    @Test
    fun theTabOwningADestinationComesFromItsGraphRoute() {
        val bookingsRoute = Graph.Bookings.serializer().descriptor.serialName
        assertEquals(MerchantTab.BOOKINGS, tabForRoutes(listOf("details", bookingsRoute, null)))
        assertNull(tabForRoutes(listOf("login", Graph.Auth.serializer().descriptor.serialName)))
    }

    /** Release builds rename classes (R8) but keep serial names, which is what navigation uses as the route. */
    @Test
    fun everyTabRouteIsTheSerialNameOfItsGraph() {
        val graphs = MerchantTab.entries.map { it.graph() }
        assertEquals(graphs.size, graphs.toSet().size, "one graph per tab")
        MerchantTab.entries.forEach { tab ->
            assertEquals(tab, tabForRoutes(listOf(tab.routeName)))
            assertTrue(tab.routeName.isNotBlank())
        }
        assertEquals(Graph.Home.serializer().descriptor.serialName, MerchantTab.HOME.routeName)
    }
}
