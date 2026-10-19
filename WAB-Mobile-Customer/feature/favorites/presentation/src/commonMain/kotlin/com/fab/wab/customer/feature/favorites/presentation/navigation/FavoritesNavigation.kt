package com.fab.wab.customer.feature.favorites.presentation.navigation

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
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.SideEffect
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.UiAction
import com.fab.wab.customer.feature.favorites.presentation.controller.vm.FavoritesViewModel
import com.fab.wab.customer.feature.favorites.presentation.screen.FavoritesScreen
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.Favorites`: S20; "Explore salons" switches to the Home tab through [openHome] (supplied by the shell). */
class FavoritesNavigation(
    override val navController: NavHostController,
    private val openHome: () -> Unit,
) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Favorites>(startDestination = Screen.Favorites) {
            composable<Screen.Favorites> { FavoritesDestination() }
        }
    }

    @Composable
    private fun FavoritesDestination() {
        val viewModel: FavoritesViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.onEvent(UiAction.OnResume) }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                SideEffect.OpenLogin -> navigateTo(Graph.Auth)
                SideEffect.OpenHome -> openHome()
                is SideEffect.OpenSalon -> navigateTo(Screen.SalonDetails(effect.salonId))
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        FavoritesScreen(state = state, onAction = viewModel::onEvent)
    }
}
