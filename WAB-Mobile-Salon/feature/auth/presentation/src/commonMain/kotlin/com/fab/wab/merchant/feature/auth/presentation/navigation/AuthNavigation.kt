package com.fab.wab.merchant.feature.auth.presentation.navigation

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import androidx.navigation.toRoute
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.NavigatorDelegation
import com.fab.wab.merchant.core.navigation.route.Graph
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.LoginContract
import com.fab.wab.merchant.feature.auth.presentation.controller.contract.OtpContract
import com.fab.wab.merchant.feature.auth.presentation.controller.vm.LoginViewModel
import com.fab.wab.merchant.feature.auth.presentation.controller.vm.OtpViewModel
import com.fab.wab.merchant.feature.auth.presentation.screen.LoginScreen
import com.fab.wab.merchant.feature.auth.presentation.screen.OtpScreen
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** `Graph.Auth`: Login (M02) and the shared OTP screen (M03); REGISTER continues to the salon registration (M04). */
class AuthNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Auth>(startDestination = Screen.Login()) {
            composable<Screen.Login> { entry -> LoginDestination(entry.toRoute()) }
            composable<Screen.Otp> { entry -> OtpDestination(entry.toRoute()) }
        }
    }

    @androidx.compose.runtime.Composable
    private fun LoginDestination(route: Screen.Login) {
        val viewModel: LoginViewModel = koinViewModel()
        LaunchedEffect(route.register) { if (route.register) viewModel.onEvent(LoginContract.UiAction.OnRegisterIntent) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is LoginContract.SideEffect.NavigateToOtp ->
                    navigateTo(Screen.Otp(AuthPurpose.LOGIN.code, effect.phone.countryCode, effect.phone.number))
                is LoginContract.SideEffect.NavigateToRegister ->
                    navigateTo(Screen.Otp(AuthPurpose.REGISTER.code, effect.phone.countryCode, effect.phone.number))
                is LoginContract.SideEffect.OpenContent -> navigateTo(Screen.ContentPage(effect.slug))
                is LoginContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        LoginScreen(state = state, onAction = viewModel::onEvent)
    }

    @androidx.compose.runtime.Composable
    private fun OtpDestination(route: Screen.Otp) {
        val purpose = AuthPurpose.fromCode(route.purpose)
        val phone = PhoneNumber(route.countryCode, route.number)
        val viewModel: OtpViewModel = koinViewModel(key = route.toString()) { parametersOf(purpose, phone) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                OtpContract.SideEffect.NavigateHome -> navigateAndClearBackstack(Graph.Home)
                is OtpContract.SideEffect.NavigateToRegistration ->
                    navigateTo(Screen.Registration(effect.phone.countryCode, effect.phone.number))
                OtpContract.SideEffect.NavigateBack -> navigateBack()
                is OtpContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        OtpScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }
}
