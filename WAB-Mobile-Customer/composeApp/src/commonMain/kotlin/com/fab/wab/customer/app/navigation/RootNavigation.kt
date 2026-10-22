package com.fab.wab.customer.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import com.fab.wab.customer.app.resources.Res
import com.fab.wab.customer.app.resources.nav_bookings
import com.fab.wab.customer.app.resources.nav_favorites
import com.fab.wab.customer.app.resources.nav_home
import com.fab.wab.customer.app.resources.nav_profile
import com.fab.wab.customer.designsystem.components.navigation.AppNavItem
import org.jetbrains.compose.resources.stringResource

/** The four tab items with their localized labels; badge counts are wired by the notification feature later. */
@Composable
fun rootNavItems(): List<AppNavItem> {
    val home = stringResource(Res.string.nav_home)
    val favorites = stringResource(Res.string.nav_favorites)
    val bookings = stringResource(Res.string.nav_bookings)
    val profile = stringResource(Res.string.nav_profile)
    return remember(home, favorites, bookings, profile) {
        listOf(
            AppNavItem(RootTab.Home.id, home, RootTab.Home.icon),
            AppNavItem(RootTab.Favorites.id, favorites, RootTab.Favorites.icon),
            AppNavItem(RootTab.Bookings.id, bookings, RootTab.Bookings.icon),
            AppNavItem(RootTab.Profile.id, profile, RootTab.Profile.icon),
        )
    }
}

/** Switches root tabs the standard way: one back stack per tab, saved and restored, never duplicated. */
fun NavHostController.switchRootTab(tab: RootTab) {
    navigate(tab.graph) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
