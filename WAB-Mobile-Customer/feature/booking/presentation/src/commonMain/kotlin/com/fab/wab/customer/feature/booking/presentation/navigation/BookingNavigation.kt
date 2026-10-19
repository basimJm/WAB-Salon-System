package com.fab.wab.customer.feature.booking.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingSuccessViewModel
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.success_copied
import com.fab.wab.customer.feature.booking.presentation.screen.BookingFlowScreen
import com.fab.wab.customer.feature.booking.presentation.screen.BookingSuccessScreen
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** S16 booking flow (registered users; S07's Book already gates guests). */
class BookingNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.BookingStart> { entry -> BookingFlowDestination(entry.toRoute<Screen.BookingStart>().salonId) }
        navGraphBuilder.composable<Screen.BookingSuccess> { entry -> BookingSuccessDestination(entry.toRoute<Screen.BookingSuccess>()) }
    }

    /** S17: View booking replaces the success screen with S15 so Back from S15 does not return here. */
    @Suppress("DEPRECATION") // LocalClipboard is suspend-only; the common plain-text ClipEntry helper is not yet stable in CMP 1.10
    @Composable
    private fun BookingSuccessDestination(route: Screen.BookingSuccess) {
        val viewModel: BookingSuccessViewModel = koinViewModel(key = route.bookingId) { parametersOf(route.bookingId, route.referenceNumber) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val clipboard = LocalClipboardManager.current
        val copied = stringResource(Res.string.success_copied)
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is BookingSuccessContract.SideEffect.CopyToClipboard -> {
                    clipboard.setText(AnnotatedString(effect.text))
                    notifications.show(copied, style = NotificationStyle.Success)
                }
                is BookingSuccessContract.SideEffect.OpenBooking -> {
                    navigateBack()
                    navigateTo(Screen.BookingDetails(effect.bookingId))
                }
                BookingSuccessContract.SideEffect.GoHome -> navigateAndClearBackstack(Graph.Home)
            }
        }
        BookingSuccessScreen(state = state, onAction = viewModel::onEvent)
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
