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
import androidx.navigation.toRoute
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingDetailsContract
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.SideEffect
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingsViewModel
import com.fab.wab.customer.feature.bookings.presentation.resources.Res
import com.fab.wab.customer.feature.bookings.presentation.resources.details_cancelled_toast
import com.fab.wab.customer.feature.bookings.presentation.screen.BookingDetailsScreen
import com.fab.wab.customer.feature.bookings.presentation.screen.BookingsScreen
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** `Graph.Bookings`: S14 + S15; "Book now" switches to the Home tab through [openHome]. */
class BookingsNavigation(
    override val navController: NavHostController,
    private val openHome: () -> Unit,
) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Bookings>(startDestination = Screen.Bookings) {
            composable<Screen.Bookings> { BookingsDestination() }
        }
        navGraphBuilder.composable<Screen.BookingDetails> { entry ->
            BookingDetailsDestination(entry.toRoute<Screen.BookingDetails>().bookingId)
        }
    }

    @Composable
    private fun BookingDetailsDestination(bookingId: String) {
        val viewModel: BookingDetailsViewModel = koinViewModel(key = bookingId) { parametersOf(bookingId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val cancelled = stringResource(Res.string.details_cancelled_toast)
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is BookingDetailsContract.SideEffect.OpenRating -> navigateTo(Screen.RateBooking(effect.bookingId))
                is BookingDetailsContract.SideEffect.Cancelled -> notifications.show(cancelled, style = NotificationStyle.Success)
                is BookingDetailsContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        BookingDetailsScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
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
