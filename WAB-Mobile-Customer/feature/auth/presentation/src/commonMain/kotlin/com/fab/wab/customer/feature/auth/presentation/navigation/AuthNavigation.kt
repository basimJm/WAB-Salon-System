package com.fab.wab.customer.feature.auth.presentation.navigation

import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.navigation
import androidx.navigation.toRoute
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LoginContract
import com.fab.wab.customer.feature.auth.presentation.controller.contract.OtpContract
import com.fab.wab.customer.feature.auth.presentation.controller.contract.RegisterContract
import com.fab.wab.customer.feature.auth.presentation.controller.vm.LoginViewModel
import com.fab.wab.customer.feature.auth.presentation.controller.vm.OtpViewModel
import com.fab.wab.customer.feature.auth.presentation.controller.vm.RegisterViewModel
import com.fab.wab.customer.feature.auth.presentation.screen.LoginScreen
import com.fab.wab.customer.feature.auth.presentation.screen.OtpScreen
import com.fab.wab.customer.feature.auth.presentation.screen.RegisterScreen
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** `Graph.Auth`: Login (S11), Register (S12) and the shared OTP screen (S13). */
class AuthNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Auth>(startDestination = Screen.Login) {
            composable<Screen.Login> { LoginDestination() }
            composable<Screen.Register> { entry -> RegisterDestination(entry.toRoute()) }
            composable<Screen.Otp> { entry -> OtpDestination(entry.toRoute()) }
        }
    }

    @androidx.compose.runtime.Composable
    private fun LoginDestination() {
        val viewModel: LoginViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is LoginContract.SideEffect.NavigateToOtp ->
                    navigateTo(Screen.Otp(AuthPurpose.LOGIN.code, effect.phone.countryCode, effect.phone.number))
                is LoginContract.SideEffect.NavigateToRegister ->
                    navigateTo(Screen.Register(effect.phone?.countryCode, effect.phone?.number))
                is LoginContract.SideEffect.OpenContent -> navigateTo(Screen.ContentPage(effect.slug))
                is LoginContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        LoginScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }

    @androidx.compose.runtime.Composable
    private fun RegisterDestination(route: Screen.Register) {
        val prefill = route.countryCode?.let { code -> route.number?.let { PhoneNumber(code, it) } }
        val viewModel: RegisterViewModel = koinViewModel(key = route.toString()) { parametersOf(prefill) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is RegisterContract.SideEffect.NavigateToOtp ->
                    navigateTo(Screen.Otp(AuthPurpose.REGISTER.code, effect.phone.countryCode, effect.phone.number))
                RegisterContract.SideEffect.NavigateHome -> navigateAndClearBackstack(Graph.Home)
                RegisterContract.SideEffect.NavigateToLogin -> navigateBack(Screen.Login)
                is RegisterContract.SideEffect.OpenContent -> navigateTo(Screen.ContentPage(effect.slug))
                is RegisterContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        RegisterScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
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
                OtpContract.SideEffect.NavigateBack -> navigateBack()
                is OtpContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        OtpScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }
}
