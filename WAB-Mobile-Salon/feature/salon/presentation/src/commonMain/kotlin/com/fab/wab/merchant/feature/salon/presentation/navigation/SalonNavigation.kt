package com.fab.wab.merchant.feature.salon.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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
import com.fab.wab.merchant.feature.salon.domain.HubTile
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonHubViewModel
import com.fab.wab.merchant.feature.salon.presentation.screen.SalonHubScreen
import org.koin.compose.viewmodel.koinViewModel

/** Destination of each tile; a tile shows only once its screen is registered (each task adds its own). */
private val TILE_SCREENS: Map<HubTile, Screen> = mapOf()

/** `Graph.Salon` tab: hub (M12) and the management screens (M13–M19, M22, M23). */
class SalonNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Salon>(startDestination = Screen.SalonHub) {
            composable<Screen.SalonHub> { HubDestination() }
        }
    }

    @Composable
    private fun HubDestination() {
        val viewModel: SalonHubViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is SalonHubContract.SideEffect.Open -> TILE_SCREENS[effect.tile]?.let(::navigateTo)
                is SalonHubContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        SalonHubScreen(state = state, available = TILE_SCREENS.keys, onAction = viewModel::onEvent)
    }
}
