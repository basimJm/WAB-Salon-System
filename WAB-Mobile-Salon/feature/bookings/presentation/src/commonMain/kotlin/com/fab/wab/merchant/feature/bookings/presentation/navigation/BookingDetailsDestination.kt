package com.fab.wab.merchant.feature.bookings.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.ui.external.ExternalActions
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.ActionMessage
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingDetailsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.details_copied
import com.fab.wab.merchant.feature.bookings.presentation.resources.done_approved
import com.fab.wab.merchant.feature.bookings.presentation.resources.done_cancelled
import com.fab.wab.merchant.feature.bookings.presentation.resources.done_completed
import com.fab.wab.merchant.feature.bookings.presentation.resources.done_no_show
import com.fab.wab.merchant.feature.bookings.presentation.resources.done_reassigned
import com.fab.wab.merchant.feature.bookings.presentation.resources.done_rejected
import com.fab.wab.merchant.feature.bookings.presentation.screen.BookingDetailsScreen
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.getString
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** M09 booking details; reachable from the list, Home, the calendar, notifications and push deep links. */
fun NavGraphBuilder.bookingDetailsDestination(navigator: Navigator) {
    composable<Screen.BookingDetails> { entry ->
        BookingDetailsRoute(entry.toRoute<Screen.BookingDetails>().bookingId, navigator)
    }
}

@Composable
private fun BookingDetailsRoute(bookingId: String, navigator: Navigator) {
    val viewModel: BookingDetailsViewModel = koinViewModel(key = bookingId) { parametersOf(bookingId) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = rememberNotificationManager()
    val external = koinInject<ExternalActions>()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            is SideEffect.Dial -> external.dial(effect.phone)
            is SideEffect.WhatsApp -> external.openWhatsApp(effect.phone)
            is SideEffect.CopyReference -> {
                external.copyText(effect.reference)
                notifications.show(getString(Res.string.details_copied), style = NotificationStyle.Success)
            }
            is SideEffect.ShowMessage -> notifications.show(getString(effect.message.text()), style = NotificationStyle.Success)
            is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
        }
    }
    BookingDetailsScreen(state = state, onAction = viewModel::onEvent, onBack = { navigator.navigateBack() })
}

internal fun ActionMessage.text(): StringResource = when (this) {
    ActionMessage.APPROVED -> Res.string.done_approved
    ActionMessage.REJECTED -> Res.string.done_rejected
    ActionMessage.CANCELLED -> Res.string.done_cancelled
    ActionMessage.COMPLETED -> Res.string.done_completed
    ActionMessage.NO_SHOW -> Res.string.done_no_show
    ActionMessage.REASSIGNED -> Res.string.done_reassigned
}
