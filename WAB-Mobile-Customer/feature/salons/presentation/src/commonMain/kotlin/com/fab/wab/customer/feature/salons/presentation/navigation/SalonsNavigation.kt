package com.fab.wab.customer.feature.salons.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import com.fab.wab.customer.core.mvi.CollectSideEffect
import com.fab.wab.customer.core.navigation.Navigator
import com.fab.wab.customer.core.navigation.NavigatorDelegation
import com.fab.wab.customer.core.navigation.route.Graph
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.core.navigation.route.Screen
import com.fab.wab.customer.core.notification.composable.rememberNotificationManager
import com.fab.wab.customer.core.notification.model.NotificationStyle
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsViewModel
import com.fab.wab.customer.feature.salons.presentation.controller.vm.FilterSheetViewModel
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.salons_nearest_dropped
import com.fab.wab.customer.feature.salons.presentation.screen.AllSalonsScreen
import com.fab.wab.customer.feature.salons.presentation.screen.FilterSheet
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** S04 (and S05 with CUS-034); reachable from Home and S06, so registered at the host level. */
class SalonsNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.AllSalons> { entry ->
            val route = entry.toRoute<Screen.AllSalons>()
            AllSalonsDestination(AllSalonsEntry(route.serviceId, route.serviceName, SalonListFilter.fromCode(route.filter)))
        }
    }

    @Composable
    private fun AllSalonsDestination(entry: AllSalonsEntry) {
        val viewModel: AllSalonsViewModel = koinViewModel { parametersOf(entry) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val nearestDropped = stringResource(Res.string.salons_nearest_dropped)
        var sheet by remember { mutableStateOf<FilterSheetRequest?>(null) }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is SideEffect.OpenSalon -> navigateTo(Screen.SalonDetails(effect.salonId))
                is SideEffect.OpenFilters -> sheet = FilterSheetRequest(effect.filters, (sheet?.key ?: 0) + 1)
                SideEffect.OpenLogin -> navigateTo(Graph.Auth)
                is SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
                SideEffect.NearestDropped -> notifications.show(nearestDropped, style = NotificationStyle.Info)
            }
        }
        AllSalonsScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
        sheet?.let { request ->
            state.gender?.let { gender ->
                FilterSheetDestination(
                    request = request,
                    gender = gender,
                    onApply = { filters ->
                        sheet = null
                        viewModel.onEvent(UiAction.OnFiltersApplied(filters))
                    },
                    onDismiss = { sheet = null },
                )
            }
        }
    }

    /** S05 (CUS-034): a fresh view model per opening (key), seeded with the active filters. */
    @Composable
    private fun FilterSheetDestination(
        request: FilterSheetRequest,
        gender: Gender,
        onApply: (SalonFilters) -> Unit,
        onDismiss: () -> Unit,
    ) {
        val viewModel: FilterSheetViewModel = koinViewModel(key = request.key.toString()) { parametersOf(request.filters, gender) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is FilterSheetContract.SideEffect.Applied -> onApply(effect.filters)
            }
        }
        FilterSheet(state = state, onAction = viewModel::onEvent, onDismiss = onDismiss)
    }
}

private data class FilterSheetRequest(val filters: SalonFilters, val key: Int)
