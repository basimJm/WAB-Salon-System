package com.fab.wab.customer.feature.auth.presentation.navigation

import androidx.compose.runtime.getValue
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
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract.SideEffect
import com.fab.wab.customer.feature.auth.presentation.controller.vm.LoginViewModel
import com.fab.wab.customer.feature.auth.presentation.screen.LoginScreen
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.Auth` starts at Login (S11); Register and OTP join the graph with their own tasks. */
class LoginNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Auth>(startDestination = Screen.Login) {
            composable<Screen.Login> {
                val viewModel: LoginViewModel = koinViewModel()
                val state by viewModel.state.collectAsStateWithLifecycle()
                val notifications = rememberNotificationManager()
                CollectSideEffect(viewModel.sideEffect) { effect ->
                    when (effect) {
                        is SideEffect.NavigateToOtp ->
                            navigateTo(Screen.Otp(AuthPurpose.LOGIN.code, effect.phone.countryCode, effect.phone.number))
                        is SideEffect.NavigateToRegister ->
                            navigateTo(Screen.Register(effect.phone?.countryCode, effect.phone?.number))
                        is SideEffect.OpenContent -> navigateTo(Screen.ContentPage(effect.slug))
                        is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
                    }
                }
                LoginScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
            }
        }
    }
}
