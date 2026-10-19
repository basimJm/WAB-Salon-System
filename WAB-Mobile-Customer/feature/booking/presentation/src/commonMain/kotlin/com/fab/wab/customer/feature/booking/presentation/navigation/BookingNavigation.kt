package com.fab.wab.customer.feature.booking.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import com.fab.wab.customer.feature.booking.presentation.screen.BookingFlowScreen
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** S16 booking flow (registered users; S07's Book already gates guests). */
class BookingNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.BookingStart> { entry -> BookingFlowDestination(entry.toRoute<Screen.BookingStart>().salonId) }
    }

    @Composable
    private fun BookingFlowDestination(salonId: String) {
        val viewModel: BookingFlowViewModel = koinViewModel(key = salonId) { parametersOf(salonId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                SideEffect.Exit -> navigateBack()
                is SideEffect.OpenVerification -> navigateTo(Screen.BookingVerify(effect.draftId))
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        BookingFlowScreen(state = state, onAction = viewModel::onEvent)
    }
}
