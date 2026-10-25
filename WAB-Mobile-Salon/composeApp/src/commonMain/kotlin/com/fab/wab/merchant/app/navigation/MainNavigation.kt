package com.fab.wab.merchant.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.feature.auth.presentation.navigation.AuthNavigation
import com.fab.wab.merchant.feature.application.presentation.navigation.ApplicationNavigation
import com.fab.wab.merchant.feature.bookings.presentation.navigation.BookingsNavigation
import com.fab.wab.merchant.feature.branches.presentation.navigation.BranchesNavigation
import com.fab.wab.merchant.feature.salon.presentation.navigation.SalonNavigation
import com.fab.wab.merchant.feature.team.presentation.navigation.TeamNavigation
import com.fab.wab.merchant.feature.finance.presentation.navigation.FinanceNavigation
import com.fab.wab.merchant.feature.notifications.presentation.navigation.NotificationsNavigation
import com.fab.wab.merchant.feature.content.presentation.navigation.ContentNavigation
import com.fab.wab.merchant.feature.more.presentation.navigation.MoreNavigation
import com.fab.wab.merchant.feature.home.presentation.navigation.HomeNavigation

/** Root NavHost: every feature registers its own graph here. */
@Composable
fun MainNavigation(
    startDestination: Graph,
    navController: NavHostController,
) {
    NavHost(navController = navController, startDestination = startDestination) {
        AuthNavigation(navController).registerGraph(this)
        HomeNavigation(navController).registerGraph(this)
        ApplicationNavigation(navController).registerGraph(this)
        BookingsNavigation(navController).registerGraph(this)
        SalonNavigation(navController).registerGraph(this)
        TeamNavigation(navController).registerGraph(this)
        BranchesNavigation(navController).registerGraph(this)
        FinanceNavigation(navController).registerGraph(this)
        NotificationsNavigation(navController).registerGraph(this)
        ContentNavigation(navController).registerGraph(this)
        MoreNavigation(navController).registerGraph(this)
    }
}
