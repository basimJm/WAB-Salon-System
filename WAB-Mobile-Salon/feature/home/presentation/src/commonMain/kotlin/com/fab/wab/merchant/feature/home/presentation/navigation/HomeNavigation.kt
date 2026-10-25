package com.fab.wab.merchant.feature.home.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.NavigatorDelegation
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.SideEffect
import com.fab.wab.merchant.feature.home.presentation.controller.vm.HomeViewModel
import com.fab.wab.merchant.feature.home.presentation.screen.HomeScreen
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.Home` tab (M07). "View all" requests and "Open calendar" switch tabs like the bottom bar does. */
class HomeNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Home>(startDestination = Screen.Home) {
            composable<Screen.Home> { HomeDestination() }
        }
    }

    @Composable
    private fun HomeDestination() {
        val viewModel: HomeViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        LifecycleResumeEffect(Unit) {
            viewModel.onEvent(HomeContract.UiAction.OnResume)
            onPauseOrDispose { }
        }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                SideEffect.OpenNotifications -> navigateTo(Screen.Notifications)
                is SideEffect.OpenBooking -> navigateTo(Screen.BookingDetails(effect.bookingId))
                SideEffect.OpenPendingRequests -> switchTab(Graph.Bookings)
                SideEffect.OpenCalendar -> switchTab(Graph.Calendar)
                SideEffect.OpenSubscription -> navigateTo(Screen.Subscription)
                SideEffect.OpenSetup -> navigateTo(Screen.SetupChecklist)
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        HomeScreen(state = state, onAction = viewModel::onEvent)
    }

    private fun switchTab(graph: Graph) {
        navController.navigate(graph) {
            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }
}
