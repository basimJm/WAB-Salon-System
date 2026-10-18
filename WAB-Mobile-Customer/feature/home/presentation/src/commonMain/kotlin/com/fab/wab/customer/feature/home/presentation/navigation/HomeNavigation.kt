package com.fab.wab.customer.feature.home.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SideEffect
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeViewModel
import com.fab.wab.customer.feature.home.presentation.screen.HomeScreen
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.Home`: S03 (external banner links open through [openUrl], supplied by the app shell). */
class HomeNavigation(
    override val navController: NavHostController,
    private val openUrl: (String) -> Unit,
) : Navigator by NavigatorDelegation(navController) {

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
        LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.onEvent(UiAction.OnResume) }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is SideEffect.OpenSalon -> navigateTo(Screen.SalonDetails(effect.salonId))
                is SideEffect.OpenAllSalons -> navigateTo(Screen.AllSalons(effect.serviceId, effect.filter?.code))
                SideEffect.OpenAllServices -> navigateTo(Screen.AllServices)
                SideEffect.OpenNotifications -> navigateTo(Screen.Notifications)
                is SideEffect.OpenUrl -> openUrl(effect.url)
                SideEffect.OpenLogin -> navigateTo(Graph.Auth)
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        HomeScreen(state = state, onAction = viewModel::onEvent)
    }
}
