package com.fab.wab.merchant.feature.branches.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.NavigatorDelegation
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchEditContract
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchOutcome
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract
import com.fab.wab.merchant.feature.branches.presentation.controller.vm.BranchEditViewModel
import com.fab.wab.merchant.feature.branches.presentation.controller.vm.BranchesViewModel
import com.fab.wab.merchant.feature.branches.presentation.resources.Res
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_created
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_done_closed
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_done_main
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_done_offline
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_done_online
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_location_blocked
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_saved
import com.fab.wab.merchant.feature.branches.presentation.screen.BranchEditScreen
import com.fab.wab.merchant.feature.branches.presentation.screen.BranchesScreen
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.getString
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** Owner branch management (MER-062), opened from the Salon hub tile "Branches". */
class BranchesNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.Branches> { BranchesDestination() }
        navGraphBuilder.composable<Screen.BranchEdit> { entry -> BranchEditDestination(entry.toRoute<Screen.BranchEdit>().branchId) }
    }

    @Composable
    private fun BranchesDestination() {
        val viewModel: BranchesViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                BranchesContract.SideEffect.AddBranch -> navigateTo(Screen.BranchEdit())
                is BranchesContract.SideEffect.EditBranch -> navigateTo(Screen.BranchEdit(effect.id))
                is BranchesContract.SideEffect.OpenBooking -> navigateTo(Screen.BookingDetails(effect.bookingId))
                is BranchesContract.SideEffect.Done -> notifications.show(
                    getString(outcomeText(effect.outcome)),
                    style = NotificationStyle.Success,
                )
                is BranchesContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        BranchesScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }

    @Composable
    private fun BranchEditDestination(branchId: String?) {
        val viewModel: BranchEditViewModel = koinViewModel(key = branchId) { parametersOf(branchId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val permissions = koinInject<PermissionFlow>()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is BranchEditContract.SideEffect.Saved -> {
                    val text = if (effect.created) Res.string.branch_created else Res.string.branch_saved
                    notifications.show(getString(text), style = NotificationStyle.Success)
                    navigateBack()
                }
                is BranchEditContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
                BranchEditContract.SideEffect.LocationBlocked -> {
                    notifications.show(getString(Res.string.branch_location_blocked), style = NotificationStyle.Info)
                    permissions.openSettings(AppPermission.LOCATION)
                }
            }
        }
        BranchEditScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }
}

private fun outcomeText(outcome: BranchOutcome): StringResource = when (outcome) {
    BranchOutcome.MAIN_SET -> Res.string.branch_done_main
    BranchOutcome.OFFLINE -> Res.string.branch_done_offline
    BranchOutcome.ONLINE -> Res.string.branch_done_online
    BranchOutcome.CLOSED -> Res.string.branch_done_closed
}
