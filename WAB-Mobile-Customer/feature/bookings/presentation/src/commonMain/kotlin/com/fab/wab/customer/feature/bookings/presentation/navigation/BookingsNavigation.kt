package com.fab.wab.customer.feature.bookings.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
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
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.SideEffect
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingsViewModel
import com.fab.wab.customer.feature.bookings.presentation.screen.BookingsScreen
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.Bookings`: S14; "Book now" switches to the Home tab through [openHome]. */
class BookingsNavigation(
    override val navController: NavHostController,
    private val openHome: () -> Unit,
) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Bookings>(startDestination = Screen.Bookings) {
            composable<Screen.Bookings> { BookingsDestination() }
        }
    }

    @Composable
    private fun BookingsDestination() {
        val viewModel: BookingsViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.onEvent(UiAction.OnResume) }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                SideEffect.OpenLogin -> navigateTo(Graph.Auth)
                SideEffect.OpenHome -> openHome()
                is SideEffect.OpenBooking -> navigateTo(Screen.BookingDetails(effect.bookingId))
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        BookingsScreen(state = state, onAction = viewModel::onEvent)
    }
}
