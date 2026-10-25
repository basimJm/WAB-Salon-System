package com.fab.wab.merchant.app.navigation

import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import com.fab.wab.merchant.core.domain.session.LaunchRoute
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.designsystem.components.navigation.MerchantTab

/** Graph that roots each bottom-navigation tab (PRD §8.1). */
fun MerchantTab.graph(): Graph = when (this) {
    MerchantTab.HOME -> Graph.Home
    MerchantTab.BOOKINGS -> Graph.Bookings
    MerchantTab.CALENDAR -> Graph.Calendar
    MerchantTab.SALON -> Graph.Salon
    MerchantTab.MORE -> Graph.More
}

/** Tabs whose screens ship in this build (each tab feature adds itself; the bar shows visible ∩ registered). */
val REGISTERED_TABS: Set<MerchantTab> =
    setOf(MerchantTab.HOME, MerchantTab.BOOKINGS, MerchantTab.CALENDAR, MerchantTab.SALON, MerchantTab.MORE)

private val MerchantTab.routeName: String get() = graph()::class.qualifiedName.orEmpty()

/** The tab owning the current destination (first route of the hierarchy that roots a tab); null outside the tabs. */
fun tabForRoutes(hierarchyRoutes: List<String?>): MerchantTab? =
    hierarchyRoutes.firstNotNullOfOrNull { route -> MerchantTab.entries.firstOrNull { it.routeName == route } }

/**
 * PRD §8.1: the bottom bar / rail only once the salon is live or offline (home route), and only on a tab's root
 * screen; detail screens and the onboarding / setup routes are full screen.
 */
fun showsNavigation(route: LaunchRoute, onTabRoot: Boolean, currentTab: MerchantTab?, tabs: List<MerchantTab>): Boolean =
    route == LaunchRoute.HOME && onTabRoot && currentTab != null && tabs.isNotEmpty()

/** Graph the NavHost starts at for a launch route; home opens the first permitted, available tab. */
fun LaunchRoute.startGraph(tabs: List<MerchantTab>): Graph = when (this) {
    LaunchRoute.LOGIN -> Graph.Auth
    LaunchRoute.APPLICATION_STATUS -> Graph.Onboarding
    LaunchRoute.SETUP_CHECKLIST -> Graph.Setup
    LaunchRoute.HOME -> tabs.firstOrNull()?.graph() ?: Graph.More
}

fun NavHostController.switchTab(tab: MerchantTab) {
    navigate(tab.graph()) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
