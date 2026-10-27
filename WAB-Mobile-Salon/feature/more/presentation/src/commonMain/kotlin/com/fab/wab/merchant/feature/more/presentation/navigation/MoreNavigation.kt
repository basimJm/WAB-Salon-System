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
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.ui.external.ExternalActions
import com.fab.wab.merchant.designsystem.components.external.rememberExternalHandoff
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MoreContract
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MoreViewModel
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MyAccountViewModel
import com.fab.wab.merchant.feature.more.presentation.resources.Res
import com.fab.wab.merchant.feature.more.presentation.resources.account_phone_changed
import com.fab.wab.merchant.feature.more.presentation.resources.account_saved
import com.fab.wab.merchant.feature.more.presentation.screen.MoreScreen
import com.fab.wab.merchant.feature.more.presentation.screen.MyAccountScreen
import org.jetbrains.compose.resources.getString
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.More` tab (M25). */
class MoreNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.More>(startDestination = Screen.More) {
            composable<Screen.More> { MoreDestination() }
            composable<Screen.MyAccount> { MyAccountDestination() }
        }
    }

    @Composable
    private fun MoreDestination() {
        val viewModel: MoreViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val handoff = rememberExternalHandoff(koinInject<ExternalActions>())
        val notifications = rememberNotificationManager()
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
                is MoreContract.SideEffect.Dial -> handoff.call(effect.phone)
                is MoreContract.SideEffect.WhatsApp -> handoff.contactWabWhatsApp(effect.phone)
                is MoreContract.SideEffect.Email -> handoff.email(effect.address)
                MoreContract.SideEffect.OpenAccount -> navigateTo(Screen.MyAccount)
                is MoreContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        MoreScreen(state = state, onAction = viewModel::onEvent)
    }

    @Composable
    private fun MyAccountDestination() {
        val viewModel: MyAccountViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        // Back from the OTP screen: the view model picks up the CHANGE_PHONE proof.
        LifecycleResumeEffect(Unit) {
            viewModel.onEvent(MyAccountContract.UiAction.OnResume)
            onPauseOrDispose { }
        }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is MyAccountContract.SideEffect.VerifyPhone -> navigateTo(
                    Screen.Otp(AuthPurpose.CHANGE_PHONE.code, effect.countryCode, effect.number),
                )
                MyAccountContract.SideEffect.Saved ->
                    notifications.show(getString(Res.string.account_saved), style = NotificationStyle.Success)
                MyAccountContract.SideEffect.PhoneChanged ->
                    notifications.show(getString(Res.string.account_phone_changed), style = NotificationStyle.Success)
                is MyAccountContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        MyAccountScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }
}
