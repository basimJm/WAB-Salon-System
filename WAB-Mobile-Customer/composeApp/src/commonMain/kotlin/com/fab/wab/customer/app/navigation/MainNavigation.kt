package com.fab.wab.customer.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.feature.auth.presentation.navigation.AuthNavigation
import com.fab.wab.customer.feature.bookings.presentation.navigation.BookingsNavigation
import com.fab.wab.customer.feature.favorites.presentation.navigation.FavoritesNavigation
import com.fab.wab.customer.feature.home.presentation.navigation.HomeNavigation
import com.fab.wab.customer.feature.salon.presentation.navigation.SalonNavigation
import com.fab.wab.customer.feature.salons.presentation.navigation.SalonsNavigation
import com.fab.wab.customer.openStoreLink

@Composable
fun MainNavigation(
    startDestination: Graph,
    navController: NavHostController,
) {
    NavHost(navController = navController, startDestination = startDestination) {
        HomeNavigation(navController, openUrl = ::openStoreLink).registerGraph(this)
        AuthNavigation(navController).registerGraph(this)
        SalonsNavigation(navController).registerGraph(this)
        SalonNavigation(navController).registerGraph(this)
        val openHome = { navController.switchRootTab(RootTab.Home) }
        FavoritesNavigation(navController, openHome).registerGraph(this)
        BookingsNavigation(navController, openHome).registerGraph(this)
        registerPlaceholderRoots(navController)
        registerPlaceholderAuthScreens()
        registerPlaceholderHomeScreens()
    }
}
