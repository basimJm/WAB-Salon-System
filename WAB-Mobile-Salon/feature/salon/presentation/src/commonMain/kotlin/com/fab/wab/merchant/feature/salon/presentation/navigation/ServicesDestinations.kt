package com.fab.wab.merchant.feature.salon.presentation.navigation

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
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogPickerContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestsContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServiceEditContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServicesContract
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.CatalogPickerViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.CatalogRequestsViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.ServiceEditViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.ServicesViewModel
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.requests_sent
import com.fab.wab.merchant.feature.salon.presentation.resources.service_activated
import com.fab.wab.merchant.feature.salon.presentation.resources.service_deactivated
import com.fab.wab.merchant.feature.salon.presentation.resources.service_saved
import com.fab.wab.merchant.feature.salon.presentation.screen.CatalogPickerScreen
import com.fab.wab.merchant.feature.salon.presentation.screen.CatalogRequestsScreen
import com.fab.wab.merchant.feature.salon.presentation.screen.ServiceEditScreen
import com.fab.wab.merchant.feature.salon.presentation.screen.ServicesScreen
import org.jetbrains.compose.resources.getString
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** M16 services: list, catalog picker, service form and catalog requests. */
internal fun NavGraphBuilder.servicesDestinations(navigator: Navigator) {
    composable<Screen.Services> { ServicesDestination(navigator) }
    composable<Screen.CatalogPicker> { CatalogDestination(navigator) }
    composable<Screen.ServiceEdit> { entry ->
        val route = entry.toRoute<Screen.ServiceEdit>()
        ServiceEditDestination(navigator, route.serviceId, route.catalogServiceId)
    }
    composable<Screen.CatalogRequests> { CatalogRequestsDestination(navigator) }
}

@Composable
private fun ServicesDestination(navigator: Navigator) {
    val viewModel: ServicesViewModel = koinViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = rememberNotificationManager()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            is ServicesContract.SideEffect.OpenService -> navigator.navigateTo(Screen.ServiceEdit(serviceId = effect.id))
            ServicesContract.SideEffect.OpenCatalog -> navigator.navigateTo(Screen.CatalogPicker)
            is ServicesContract.SideEffect.Toggled -> notifications.show(
                getString(if (effect.active) Res.string.service_activated else Res.string.service_deactivated),
                style = NotificationStyle.Success,
            )
            is ServicesContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
        }
    }
    ServicesScreen(state = state, onAction = viewModel::onEvent, onBack = { navigator.navigateBack() })
}

@Composable
private fun CatalogDestination(navigator: Navigator) {
    val viewModel: CatalogPickerViewModel = koinViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = rememberNotificationManager()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            is CatalogPickerContract.SideEffect.OpenNew -> navigator.navigateTo(Screen.ServiceEdit(catalogServiceId = effect.catalogId))
            is CatalogPickerContract.SideEffect.OpenExisting -> navigator.navigateTo(Screen.ServiceEdit(serviceId = effect.serviceId))
            CatalogPickerContract.SideEffect.OpenRequests -> navigator.navigateTo(Screen.CatalogRequests)
            is CatalogPickerContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
        }
    }
    CatalogPickerScreen(state = state, canRequest = true, onAction = viewModel::onEvent, onBack = { navigator.navigateBack() })
}

@Composable
private fun ServiceEditDestination(navigator: Navigator, serviceId: String?, catalogServiceId: String?) {
    val viewModel: ServiceEditViewModel = koinViewModel(key = serviceId ?: catalogServiceId) { parametersOf(serviceId, catalogServiceId) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = rememberNotificationManager()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            ServiceEditContract.SideEffect.Saved -> {
                notifications.show(getString(Res.string.service_saved), style = NotificationStyle.Success)
                navigator.navigateBack(Screen.Services)
            }
            is ServiceEditContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
        }
    }
    ServiceEditScreen(state = state, onAction = viewModel::onEvent, onBack = { navigator.navigateBack() })
}

@Composable
private fun CatalogRequestsDestination(navigator: Navigator) {
    val viewModel: CatalogRequestsViewModel = koinViewModel()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val notifications = rememberNotificationManager()
    CollectSideEffect(viewModel.sideEffect) { effect ->
        when (effect) {
            CatalogRequestsContract.SideEffect.Sent -> notifications.show(
                getString(Res.string.requests_sent),
                style = NotificationStyle.Success,
            )
            is CatalogRequestsContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
        }
    }
    CatalogRequestsScreen(state = state, onAction = viewModel::onEvent, onBack = { navigator.navigateBack() })
}
