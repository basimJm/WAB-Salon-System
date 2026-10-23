package com.fab.wab.merchant.feature.finance.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.NavigatorDelegation
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.BankDetailsContract
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.BankDetailsViewModel
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.FinanceViewModel
import com.fab.wab.merchant.feature.finance.presentation.resources.Res
import com.fab.wab.merchant.feature.finance.presentation.resources.bank_verified
import com.fab.wab.merchant.feature.finance.presentation.screen.BankDetailsScreen
import com.fab.wab.merchant.feature.finance.presentation.screen.FinanceScreen
import org.jetbrains.compose.resources.getString
import org.koin.compose.viewmodel.koinViewModel

/** M22 finance and bank details (opened from the salon hub). */
class FinanceNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.Finance> { FinanceDestination() }
        navGraphBuilder.composable<Screen.BankDetails> { BankDestination() }
    }

    @Composable
    private fun FinanceDestination() {
        val viewModel: FinanceViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                FinanceContract.SideEffect.OpenBank -> navigateTo(Screen.BankDetails)
                is FinanceContract.SideEffect.OpenBooking -> navigateTo(Screen.BookingDetails(effect.bookingId))
                is FinanceContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        FinanceScreen(state = state, bankReady = true, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }

    @Composable
    private fun BankDestination() {
        val viewModel: BankDetailsViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        // Back from the OTP screen: the view model picks up the BANK_DETAILS proof.
        LifecycleResumeEffect(Unit) {
            viewModel.onEvent(BankDetailsContract.UiAction.OnResume)
            onPauseOrDispose { }
        }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is BankDetailsContract.SideEffect.VerifyPhone -> navigateTo(
                    Screen.Otp(AuthPurpose.BANK_DETAILS.code, effect.countryCode, effect.number),
                )
                BankDetailsContract.SideEffect.Saved -> {
                    notifications.show(getString(Res.string.bank_verified), style = NotificationStyle.Success)
                    navigateBack()
                }
                is BankDetailsContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        BankDetailsScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }
}
