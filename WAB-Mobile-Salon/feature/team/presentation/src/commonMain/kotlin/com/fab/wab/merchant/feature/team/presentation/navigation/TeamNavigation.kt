package com.fab.wab.merchant.feature.team.presentation.navigation

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
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberEditContract
import com.fab.wab.merchant.feature.team.presentation.controller.contract.PermissionsContract
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffMessage
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract
import com.fab.wab.merchant.feature.team.presentation.controller.vm.MemberEditViewModel
import com.fab.wab.merchant.feature.team.presentation.controller.vm.PermissionsViewModel
import com.fab.wab.merchant.feature.team.presentation.controller.vm.StaffProfileViewModel
import com.fab.wab.merchant.feature.team.presentation.controller.vm.TeamViewModel
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.member_added
import com.fab.wab.merchant.feature.team.presentation.resources.member_saved
import com.fab.wab.merchant.feature.team.presentation.resources.perm_saved
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_deleted
import com.fab.wab.merchant.feature.team.presentation.resources.staff_leave_saved
import com.fab.wab.merchant.feature.team.presentation.resources.staff_saved
import com.fab.wab.merchant.feature.team.presentation.resources.team_deactivated
import com.fab.wab.merchant.feature.team.presentation.resources.team_reactivated
import com.fab.wab.merchant.feature.team.presentation.screen.MemberEditScreen
import com.fab.wab.merchant.feature.team.presentation.screen.PermissionsScreen
import com.fab.wab.merchant.feature.team.presentation.screen.StaffProfileScreen
import com.fab.wab.merchant.feature.team.presentation.screen.TeamScreen
import org.jetbrains.compose.resources.getString
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** M17 team list, member form, staff profile and the M18 permissions editor (screens inside the Salon tab, opened from the hub). */
class TeamNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.Team> { TeamDestination() }
        navGraphBuilder.composable<Screen.MemberEdit> { entry -> MemberDestination(entry.toRoute<Screen.MemberEdit>().memberId) }
        navGraphBuilder.composable<Screen.StaffProfile> { entry -> StaffDestination(entry.toRoute<Screen.StaffProfile>().memberId) }
        navGraphBuilder.composable<Screen.PermissionsEditor> { entry -> PermissionsDestination(entry.toRoute<Screen.PermissionsEditor>().memberId) }
    }

    @Composable
    private fun TeamDestination() {
        val viewModel: TeamViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is TeamContract.SideEffect.OpenMember -> navigateTo(Screen.MemberEdit(effect.id))
                is TeamContract.SideEffect.OpenStaff -> navigateTo(Screen.StaffProfile(effect.id))
                TeamContract.SideEffect.AddMember -> navigateTo(Screen.MemberEdit())
                is TeamContract.SideEffect.OpenBooking -> navigateTo(Screen.BookingDetails(effect.bookingId))
                is TeamContract.SideEffect.ActiveChanged -> notifications.show(
                    getString(if (effect.active) Res.string.team_reactivated else Res.string.team_deactivated),
                    style = NotificationStyle.Success,
                )
                is TeamContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        TeamScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }

    @Composable
    private fun MemberDestination(memberId: String?) {
        val viewModel: MemberEditViewModel = koinViewModel(key = memberId) { parametersOf(memberId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is MemberEditContract.SideEffect.Saved -> {
                    notifications.show(getString(if (effect.added) Res.string.member_added else Res.string.member_saved), style = NotificationStyle.Success)
                    navigateBack()
                }
                is MemberEditContract.SideEffect.OpenPermissions -> navigateTo(Screen.PermissionsEditor(effect.memberId))
                is MemberEditContract.SideEffect.OpenStaff -> navigateTo(Screen.StaffProfile(effect.memberId))
                is MemberEditContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        MemberEditScreen(
            state = state,
            permissionsReady = true,
            staffReady = state.providesServices,
            onAction = viewModel::onEvent,
            onBack = { navigateBack() },
        )
    }

    @Composable
    private fun StaffDestination(memberId: String) {
        val viewModel: StaffProfileViewModel = koinViewModel(key = memberId) { parametersOf(memberId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is StaffProfileContract.SideEffect.Done -> notifications.show(
                    getString(
                        when (effect.message) {
                            StaffMessage.PROFILE_SAVED -> Res.string.staff_saved
                            StaffMessage.LEAVE_SAVED -> Res.string.staff_leave_saved
                            StaffMessage.LEAVE_DELETED -> Res.string.staff_leave_deleted
                        },
                    ),
                    style = NotificationStyle.Success,
                )
                is StaffProfileContract.SideEffect.OpenBooking -> navigateTo(Screen.BookingDetails(effect.bookingId))
                is StaffProfileContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        StaffProfileScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }

    @Composable
    private fun PermissionsDestination(memberId: String) {
        val viewModel: PermissionsViewModel = koinViewModel(key = memberId) { parametersOf(memberId) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                PermissionsContract.SideEffect.Saved -> notifications.show(getString(Res.string.perm_saved), style = NotificationStyle.Success)
                is PermissionsContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        PermissionsScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }
}
