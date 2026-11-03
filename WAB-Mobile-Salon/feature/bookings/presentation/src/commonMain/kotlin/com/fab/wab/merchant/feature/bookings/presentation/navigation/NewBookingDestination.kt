package com.fab.wab.merchant.feature.bookings.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.NewBookingViewModel
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_created
import com.fab.wab.merchant.feature.bookings.presentation.screen.NewBookingScreen
import org.jetbrains.compose.resources.getString
import org.koin.compose.viewmodel.koinViewModel

/** MER-085 "New booking": on success the form closes and the new booking's details open with a success banner. */
fun NavGraphBuilder.newBookingDestination(navigator: Navigator) {
    composable<Screen.NewBooking> { NewBookingRoute(navigator) }
}

@Composable
private fun NewBookingRoute(navigator: Navigator) {
    val viewModel: NewBookingViewModel = koinViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = rememberNotificationManager()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            is SideEffect.OpenBooking -> {
                navigator.navigateBack()
                navigator.navigateTo(Screen.BookingDetails(effect.id))
                notifications.show(getString(Res.string.nb_created), style = NotificationStyle.Success)
            }
            is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
        }
    }
    NewBookingScreen(state = state, onAction = viewModel::onEvent, onBack = { navigator.navigateBack() })
}
