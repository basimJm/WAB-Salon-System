package com.fab.wab.merchant.feature.application.presentation.navigation

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
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationStatusContract
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationMode
import com.fab.wab.merchant.feature.application.presentation.controller.vm.ApplicationStatusViewModel
import com.fab.wab.merchant.feature.application.presentation.controller.vm.RegistrationViewModel
import com.fab.wab.merchant.feature.application.presentation.screen.ApplicationStatusScreen
import com.fab.wab.merchant.feature.application.presentation.screen.RegistrationScreen
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** `Graph.Onboarding`: application status (M05) with the registration (M04) and its resubmission. */
class ApplicationNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Onboarding>(startDestination = Screen.ApplicationStatus) {
            composable<Screen.ApplicationStatus> { StatusDestination() }
            composable<Screen.Registration> { RegistrationDestination(RegistrationMode.NEW) }
            composable<Screen.ApplicationResubmit> { RegistrationDestination(RegistrationMode.RESUBMIT) }
        }
    }

    @Composable
    private fun StatusDestination() {
        val viewModel: ApplicationStatusViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                ApplicationStatusContract.SideEffect.NavigateToChecklist -> navigateTo(Screen.SetupChecklist)
                ApplicationStatusContract.SideEffect.NavigateToResubmit -> navigateTo(Screen.ApplicationResubmit)
                ApplicationStatusContract.SideEffect.NavigateHome -> navigateAndClearBackstack(Graph.Home)
                is ApplicationStatusContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        ApplicationStatusScreen(state = state, onAction = viewModel::onEvent)
    }

    @Composable
    private fun RegistrationDestination(mode: RegistrationMode) {
        val viewModel: RegistrationViewModel = koinViewModel(key = mode.name) { parametersOf(mode) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                RegistrationContract.SideEffect.NavigateToStatus -> navigateAndClearBackstack(Graph.Onboarding)
                RegistrationContract.SideEffect.NavigateToLogin -> navigateAndClearBackstack(Graph.Auth)
                is RegistrationContract.SideEffect.OpenContent -> navigateTo(Screen.ContentPage(effect.slug))
                is RegistrationContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        RegistrationScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }
}
