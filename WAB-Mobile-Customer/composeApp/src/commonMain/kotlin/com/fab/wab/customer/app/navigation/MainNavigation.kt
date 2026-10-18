package com.fab.wab.customer.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.feature.auth.presentation.navigation.AuthNavigation
import com.fab.wab.customer.feature.home.presentation.navigation.HomeNavigation
import com.fab.wab.customer.openStoreLink

@Composable
fun MainNavigation(
    startDestination: Graph,
    navController: NavHostController,
) {
    NavHost(navController = navController, startDestination = startDestination) {
        HomeNavigation(navController, openUrl = ::openStoreLink).registerGraph(this)
        AuthNavigation(navController).registerGraph(this)
        registerPlaceholderRoots(navController)
        registerPlaceholderAuthScreens()
        registerPlaceholderHomeScreens()
    }
}
