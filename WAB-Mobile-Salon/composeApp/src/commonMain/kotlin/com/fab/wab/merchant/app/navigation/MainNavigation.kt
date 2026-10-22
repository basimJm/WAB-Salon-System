package com.fab.wab.merchant.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.feature.auth.presentation.navigation.AuthNavigation
import com.fab.wab.merchant.feature.application.presentation.navigation.ApplicationNavigation
import com.fab.wab.merchant.feature.bookings.presentation.navigation.BookingsNavigation
import com.fab.wab.merchant.feature.salon.presentation.navigation.SalonNavigation
import com.fab.wab.merchant.feature.sample.presentation.navigation.SampleNavigation

/** Root NavHost: every feature registers its own graph here. */
@Composable
fun MainNavigation(
    startDestination: Graph,
    navController: NavHostController,
) {
    NavHost(navController = navController, startDestination = startDestination) {
        AuthNavigation(navController).registerGraph(this)
        ApplicationNavigation(navController).registerGraph(this)
        BookingsNavigation(navController).registerGraph(this)
        SalonNavigation(navController).registerGraph(this)
        SampleNavigation(navController).registerGraph(this)
    }
}
