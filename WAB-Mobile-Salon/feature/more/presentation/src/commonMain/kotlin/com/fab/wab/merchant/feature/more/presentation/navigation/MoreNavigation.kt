package com.fab.wab.merchant.feature.more.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.LifecycleResumeEffect
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
import com.fab.wab.merchant.core.ui.external.ExternalActions
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MoreViewModel
import com.fab.wab.merchant.feature.more.presentation.screen.MoreScreen
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.More` tab (M25). */
class MoreNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.More>(startDestination = Screen.More) {
            composable<Screen.More> { MoreDestination() }
        }
    }

    @Composable
    private fun MoreDestination() {
        val viewModel: MoreViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val external = koinInject<ExternalActions>()
        // Back from the system overlay screen: refresh its status.
        LifecycleResumeEffect(Unit) {
            viewModel.onEvent(MoreContract.UiAction.OnResume)
            onPauseOrDispose { }
        }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                MoreContract.SideEffect.OpenFaq -> navigateTo(Screen.Faq)
                is MoreContract.SideEffect.OpenContent -> navigateTo(Screen.ContentPage(effect.slug))
                MoreContract.SideEffect.OpenNotifications -> navigateTo(Screen.Notifications)
                is MoreContract.SideEffect.Dial -> external.dial(effect.phone)
                is MoreContract.SideEffect.WhatsApp -> external.openWhatsApp(effect.phone)
                is MoreContract.SideEffect.Email -> external.email(effect.address)
            }
        }
        MoreScreen(state = state, onAction = viewModel::onEvent)
    }
}
