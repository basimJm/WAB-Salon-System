package com.fab.wab.customer.feature.profile.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.compose.navigation
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.profile.domain.model.ProfileDefaults
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract
import com.fab.wab.customer.feature.profile.presentation.controller.vm.EditProfileViewModel
import com.fab.wab.customer.feature.profile.presentation.resources.edit_saved
import com.fab.wab.customer.feature.profile.presentation.screen.EditProfileScreen
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.SideEffect
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.vm.ProfileViewModel
import com.fab.wab.customer.feature.profile.presentation.resources.Res
import com.fab.wab.customer.feature.profile.presentation.resources.profile_account_deleted
import com.fab.wab.customer.feature.profile.presentation.resources.profile_logged_out
import com.fab.wab.customer.feature.profile.presentation.screen.ProfileScreen
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

/** `Graph.Profile`: S21 (S22 personal info and the FAQ page are separate destinations). */
class ProfileNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.navigation<Graph.Profile>(startDestination = Screen.Profile) {
            composable<Screen.Profile> { ProfileDestination() }
        }
        navGraphBuilder.composable<Screen.PersonalInfo> { EditProfileDestination() }
    }

    /** S22: the OTP screen (CHANGE_PHONE) pops back here with the proof; Saved pops to S21 with a toast. */
    @Composable
    private fun EditProfileDestination() {
        val viewModel: EditProfileViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val saved = stringResource(Res.string.edit_saved)
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is EditProfileContract.SideEffect.NavigateToOtp ->
                    navigateTo(Screen.Otp(AuthPurpose.CHANGE_PHONE.code, effect.phone.countryCode, effect.phone.number))
                EditProfileContract.SideEffect.Saved -> {
                    notifications.show(saved, style = NotificationStyle.Success)
                    navigateBack()
                }
                is EditProfileContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        EditProfileScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }

    @Composable
    private fun ProfileDestination() {
        val viewModel: ProfileViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val loggedOut = stringResource(Res.string.profile_logged_out)
        val deleted = stringResource(Res.string.profile_account_deleted, ProfileDefaults.DELETION_GRACE_DAYS)
        LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.onEvent(UiAction.OnResume) }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                SideEffect.OpenLogin -> navigateTo(Graph.Auth)
                SideEffect.OpenPersonalInfo -> navigateTo(Screen.PersonalInfo)
                SideEffect.OpenFaq -> navigateTo(Screen.Faq)
                is SideEffect.OpenContent -> navigateTo(Screen.ContentPage(effect.slug))
                SideEffect.LoggedOut -> notifications.show(loggedOut, style = NotificationStyle.Success)
                SideEffect.AccountDeleted -> notifications.show(deleted, style = NotificationStyle.Success)
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        ProfileScreen(state = state, onAction = viewModel::onEvent)
    }
}
