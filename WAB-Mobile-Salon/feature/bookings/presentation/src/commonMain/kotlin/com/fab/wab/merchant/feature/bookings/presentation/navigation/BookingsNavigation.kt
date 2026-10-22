package com.fab.wab.merchant.feature.bookings.presentation.navigation

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
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.screen.BookingsScreen
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.Bookings` tab: list (M08) and booking details (M09). */
class BookingsNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Bookings>(startDestination = Screen.Bookings) {
            composable<Screen.Bookings> { ListDestination() }
            bookingDetailsDestination(this@BookingsNavigation)
        }
    }

    @Composable
    private fun ListDestination() {
        val viewModel: BookingsViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is BookingsContract.SideEffect.OpenDetails -> navigateTo(Screen.BookingDetails(effect.id))
                is BookingsContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        BookingsScreen(state = state, onAction = viewModel::onEvent)
    }
}
