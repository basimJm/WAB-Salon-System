package com.fab.wab.merchant.feature.salon.presentation.navigation

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
import com.fab.wab.merchant.core.ui.permission.AppPermission
import com.fab.wab.merchant.core.ui.permission.PermissionFlow
import com.fab.wab.merchant.feature.salon.domain.HubTile
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.GalleryContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursMessage
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PolicyContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonProfileContract
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.GalleryViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.HoursViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.PolicyViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonHubViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonProfileViewModel
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.cancelled_bookings
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_added
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_deleted
import com.fab.wab.merchant.feature.salon.presentation.resources.closure_updated
import com.fab.wab.merchant.feature.salon.presentation.resources.gallery_deleted
import com.fab.wab.merchant.feature.salon.presentation.resources.hours_saved
import com.fab.wab.merchant.feature.salon.presentation.resources.policy_saved
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_location_blocked
import com.fab.wab.merchant.feature.salon.presentation.resources.profile_saved
import com.fab.wab.merchant.feature.salon.presentation.screen.GalleryScreen
import com.fab.wab.merchant.feature.salon.presentation.screen.HoursScreen
import com.fab.wab.merchant.feature.salon.presentation.screen.PolicyScreen
import com.fab.wab.merchant.feature.salon.presentation.screen.SalonHubScreen
import com.fab.wab.merchant.feature.salon.presentation.screen.SalonProfileScreen
import org.jetbrains.compose.resources.getPluralString
import org.jetbrains.compose.resources.getString
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/** Destination of each tile; a tile shows only once its screen is registered (each task adds its own). */
private val TILE_SCREENS: Map<HubTile, Screen> = mapOf(
    HubTile.PROFILE to Screen.SalonProfile,
    HubTile.GALLERY to Screen.Gallery,
    HubTile.HOURS to Screen.WorkingHours,
    HubTile.SERVICES to Screen.Services,
    HubTile.TEAM to Screen.Team,
    HubTile.POLICIES to Screen.Policies,
    HubTile.FINANCE to Screen.Finance,
)

/** `Graph.Salon` tab: hub (M12) and the management screens (M13–M19, M22, M23). */
class SalonNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Salon>(startDestination = Screen.SalonHub) {
            composable<Screen.SalonHub> { HubDestination() }
            composable<Screen.SalonProfile> { ProfileDestination() }
            composable<Screen.Gallery> { GalleryDestination() }
            composable<Screen.WorkingHours> { HoursDestination() }
            servicesDestinations(this@SalonNavigation)
            composable<Screen.Policies> { PolicyDestination() }
        }
    }

    @Composable
    private fun HubDestination() {
        val viewModel: SalonHubViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is SalonHubContract.SideEffect.Open -> TILE_SCREENS[effect.tile]?.let(::navigateTo)
                is SalonHubContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        SalonHubScreen(state = state, available = TILE_SCREENS.keys, onAction = viewModel::onEvent)
    }

    @Composable
    private fun ProfileDestination() {
        val viewModel: SalonProfileViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val permissions = koinInject<PermissionFlow>()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                SalonProfileContract.SideEffect.Saved -> notifications.show(getString(Res.string.profile_saved), style = NotificationStyle.Success)
                SalonProfileContract.SideEffect.NavigateBack -> navigateBack()
                is SalonProfileContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
                SalonProfileContract.SideEffect.LocationBlocked -> {
                    notifications.show(getString(Res.string.profile_location_blocked), style = NotificationStyle.Info)
                    permissions.openSettings(AppPermission.LOCATION)
                }
            }
        }
        SalonProfileScreen(state = state, onAction = viewModel::onEvent)
    }

    @Composable
    private fun GalleryDestination() {
        val viewModel: GalleryViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                GalleryContract.SideEffect.Deleted -> notifications.show(getString(Res.string.gallery_deleted), style = NotificationStyle.Success)
                is GalleryContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        GalleryScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }

    @Composable
    private fun HoursDestination() {
        val viewModel: HoursViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is HoursContract.SideEffect.Done -> notifications.show(hoursMessage(effect.message, effect.cancelledBookings), style = NotificationStyle.Success)
                is HoursContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        HoursScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }


    @Composable
    private fun PolicyDestination() {
        val viewModel: PolicyViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                PolicyContract.SideEffect.Saved -> notifications.show(getString(Res.string.policy_saved), style = NotificationStyle.Success)
                is PolicyContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        PolicyScreen(state = state, onAction = viewModel::onEvent, onBack = { navigateBack() })
    }
}

private suspend fun hoursMessage(message: HoursMessage, cancelled: Int): String {
    val text = getString(
        when (message) {
            HoursMessage.WEEK_SAVED -> Res.string.hours_saved
            HoursMessage.CLOSURE_ADDED -> Res.string.closure_added
            HoursMessage.CLOSURE_UPDATED -> Res.string.closure_updated
            HoursMessage.CLOSURE_DELETED -> Res.string.closure_deleted
        },
    )
    return if (cancelled == 0) text else getPluralString(Res.plurals.cancelled_bookings, cancelled, cancelled) + MESSAGE_SEPARATOR + text
}

private const val MESSAGE_SEPARATOR = "\n"
