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
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowArgs
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingSuccessContract
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingVerifyContract
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingSuccessViewModel
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingVerifyViewModel
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.success_copied
import com.fab.wab.customer.feature.booking.presentation.screen.BookingFlowScreen
import com.fab.wab.customer.feature.booking.presentation.screen.BookingSuccessScreen
import com.fab.wab.customer.feature.booking.presentation.screen.BookingVerifyScreen
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** S16 booking flow (registered users; S07's Book already gates guests). */
class BookingNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.BookingStart> { entry ->
            val route = entry.toRoute<Screen.BookingStart>()
            BookingFlowDestination(BookingFlowArgs(route.salonId, route.branchId))
        }
        navGraphBuilder.composable<Screen.BookingVerify> { entry ->
            BookingVerifyDestination(entry.toRoute<Screen.BookingVerify>().draftId)
        }
        navGraphBuilder.composable<Screen.BookingSuccess> { entry -> BookingSuccessDestination(entry.toRoute<Screen.BookingSuccess>()) }
    }

    /** S16 step 6: OTP (BOOKING_CONFIRMATION) on the customer's own phone; success replaces this screen with S17. */
    @Composable
    private fun BookingVerifyDestination(draftId: String) {
        val viewModel: BookingVerifyViewModel = koinViewModel(key = draftId) { parametersOf(draftId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is BookingVerifyContract.SideEffect.OpenOtp ->
                    navigateTo(Screen.Otp(AuthPurpose.BOOKING_CONFIRMATION.code, effect.phone.countryCode, effect.phone.number))
                // The booking is created: drop the whole flow (start, summary, verify) so Back from S17 leaves booking.
                is BookingVerifyContract.SideEffect.OpenSuccess ->
                    navController.navigate(Screen.BookingSuccess(effect.bookingId, effect.referenceNumber)) {
                        popUpTo<Screen.BookingStart> { inclusive = true }
                    }
                BookingVerifyContract.SideEffect.BackToBooking -> navigateBack()
            }
        }
        BookingVerifyScreen(state = state, onAction = viewModel::onEvent)
    }

    /** S17: View booking replaces the success screen with S15 so Back from S15 does not return here. */
    @Suppress("DEPRECATION") // LocalClipboard is suspend-only; the common plain-text ClipEntry helper is not yet stable in CMP 1.10
    @Composable
    private fun BookingSuccessDestination(route: Screen.BookingSuccess) {
        val viewModel: BookingSuccessViewModel = koinViewModel(
            key = route.bookingId,
        ) { parametersOf(route.bookingId, route.referenceNumber) }
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
    private fun BookingFlowDestination(args: BookingFlowArgs) {
        val viewModel: BookingFlowViewModel = koinViewModel(key = args.salonId) { parametersOf(args) }
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
