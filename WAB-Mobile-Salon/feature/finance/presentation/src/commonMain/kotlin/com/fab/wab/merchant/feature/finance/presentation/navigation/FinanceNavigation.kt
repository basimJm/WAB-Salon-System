package com.fab.wab.merchant.feature.finance.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.FinanceViewModel
import com.fab.wab.merchant.feature.finance.presentation.screen.FinanceScreen
import org.koin.compose.viewmodel.koinViewModel

/** Bank details (MER-045) ship next; the entry stays hidden until then. */
internal const val BANK_DETAILS_READY = false

/** M22 finance (opened from the salon hub). */
class FinanceNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.Finance> { FinanceDestination() }
    }

    @Composable
    private fun FinanceDestination() {
        val viewModel: FinanceViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                FinanceContract.SideEffect.OpenBank -> if (BANK_DETAILS_READY) navigateTo(Screen.BankDetails)
                is FinanceContract.SideEffect.OpenBooking -> navigateTo(Screen.BookingDetails(effect.bookingId))
                is FinanceContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        FinanceScreen(state = state, bankReady = BANK_DETAILS_READY, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }
}
