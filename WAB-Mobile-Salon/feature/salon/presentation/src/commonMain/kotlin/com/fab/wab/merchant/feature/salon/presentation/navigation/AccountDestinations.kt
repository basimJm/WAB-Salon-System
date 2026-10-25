package com.fab.wab.merchant.feature.salon.presentation.navigation

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
import com.fab.wab.merchant.core.ui.external.ExternalActions
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SubscriptionContract
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SubscriptionViewModel
import com.fab.wab.merchant.feature.salon.presentation.screen.SubscriptionScreen
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

/** M23 subscription & status. */
internal fun NavGraphBuilder.accountDestinations(navigator: Navigator) {
    composable<Screen.Subscription> { SubscriptionDestination(navigator) }
}

@Composable
private fun SubscriptionDestination(navigator: Navigator) {
    val viewModel: SubscriptionViewModel = koinViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = rememberNotificationManager()
    val external = koinInject<ExternalActions>()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            is SubscriptionContract.SideEffect.Dial -> external.dial(effect.phone)
            is SubscriptionContract.SideEffect.WhatsApp -> external.openWhatsApp(effect.phone)
            is SubscriptionContract.SideEffect.Email -> external.email(effect.address)
            is SubscriptionContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
        }
    }
    SubscriptionScreen(state = state, onAction = viewModel::onEvent, onBack = { navigator.navigateBack() })
}
