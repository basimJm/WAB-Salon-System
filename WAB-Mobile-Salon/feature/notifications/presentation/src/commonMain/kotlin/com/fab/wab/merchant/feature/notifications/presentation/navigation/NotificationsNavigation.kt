package com.fab.wab.merchant.feature.notifications.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.fab.wab.merchant.core.mvi.CollectSideEffect
import com.fab.wab.merchant.core.navigation.Navigator
import com.fab.wab.merchant.core.navigation.NavigatorDelegation
import com.fab.wab.merchant.core.navigation.route.Screen
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.feature.notifications.domain.model.NotificationTarget
import com.fab.wab.merchant.feature.notifications.presentation.controller.contract.NotificationsContract.SideEffect
import com.fab.wab.merchant.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.merchant.feature.notifications.presentation.controller.vm.NotificationsViewModel
import com.fab.wab.merchant.feature.notifications.presentation.screen.NotificationsScreen
import org.koin.compose.viewmodel.koinViewModel

/** M24 notifications (signed-in members). */
class NotificationsNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.Notifications> { NotificationsDestination() }
    }

    @Composable
    private fun NotificationsDestination() {
        val viewModel: NotificationsViewModel = koinViewModel()
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.onEvent(UiAction.OnResume) }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is SideEffect.Open -> navigateTo(
                    when (val target = effect.target) {
                        is NotificationTarget.Booking -> Screen.BookingDetails(target.bookingId)
                        NotificationTarget.Application -> Screen.ApplicationStatus
                        NotificationTarget.CatalogRequests -> Screen.CatalogRequests
                        NotificationTarget.Finance -> Screen.Finance
                        NotificationTarget.Subscription -> Screen.Subscription
                        NotificationTarget.Reviews -> Screen.Reviews
                    },
                )
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        NotificationsScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }
}
