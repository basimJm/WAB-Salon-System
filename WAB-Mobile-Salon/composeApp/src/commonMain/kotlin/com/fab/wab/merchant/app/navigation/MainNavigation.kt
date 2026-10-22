package com.fab.wab.merchant.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.feature.sample.presentation.navigation.SampleNavigation

/** Root NavHost: every feature registers its own graph here. */
@Composable
fun MainNavigation(
    startDestination: Graph,
    navController: NavHostController,
) {
    NavHost(navController = navController, startDestination = startDestination) {
        SampleNavigation(navController).registerGraph(this)
    }
}
