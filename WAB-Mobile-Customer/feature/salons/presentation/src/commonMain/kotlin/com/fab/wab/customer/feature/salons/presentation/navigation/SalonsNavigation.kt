package com.fab.wab.customer.feature.salons.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
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
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsViewModel
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllServicesViewModel
import com.fab.wab.customer.feature.salons.presentation.controller.vm.FilterSheetViewModel
import com.fab.wab.customer.feature.salons.presentation.resources.Res
import com.fab.wab.customer.feature.salons.presentation.resources.salons_nearest_dropped
import com.fab.wab.customer.feature.salons.presentation.screen.AllSalonsScreen
import com.fab.wab.customer.feature.salons.presentation.screen.AllServicesScreen
import com.fab.wab.customer.feature.salons.presentation.screen.FilterSheet
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** S04 + S05 sheet and S06; reachable from Home, so registered at the host level. */
class SalonsNavigation(override val navController: NavHostController) : Navigator by NavigatorDelegation(navController) {

    override fun registerGraph(navGraphBuilder: NavGraphBuilder) {
        navGraphBuilder.composable<Screen.AllSalons> { entry ->
            val route = entry.toRoute<Screen.AllSalons>()
            val entry = AllSalonsEntry(
                gender = Gender.fromCode(route.gender),
                serviceId = route.serviceId,
                serviceName = route.serviceName,
                filter = SalonListFilter.fromCode(route.filter),
                businessType = BusinessType.fromCodeOrNull(route.businessType),
            )
            AllSalonsDestination(entry)
        }
        navGraphBuilder.composable<Screen.AllServices> { entry ->
            val route = entry.toRoute<Screen.AllServices>()
            val gender = Gender.fromCode(route.gender) ?: Gender.entries.first()
            AllServicesDestination(gender, BusinessType.fromCodeOrNull(route.businessType) ?: BusinessType.SALON)
        }
    }

    @Composable
    private fun AllServicesDestination(gender: Gender, businessType: BusinessType) {
        val viewModel: AllServicesViewModel = koinViewModel { parametersOf(gender, businessType) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is AllServicesContract.SideEffect.OpenSalons ->
                    navigateTo(Screen.AllSalons(gender.code, effect.serviceId, effect.serviceName, businessType = effect.businessType.code))
                is AllServicesContract.SideEffect.ShowError -> notifications.show(effect.message, style = NotificationStyle.Error)
            }
        }
        AllServicesScreen(state = state, onAction = viewModel::onEvent, onBack = ::navigateBack)
    }

    @Composable
    private fun AllSalonsDestination(entry: AllSalonsEntry) {
        val viewModel: AllSalonsViewModel = koinViewModel { parametersOf(entry) }
        val state by viewModel.state.collectAsStateWithLifecycle()
        val notifications = rememberNotificationManager()
        val nearestDropped = stringResource(Res.string.salons_nearest_dropped)
        var sheet by remember { mutableStateOf<FilterSheetRequest?>(null) }
        var sheetOpenings by rememberSaveable { mutableIntStateOf(0) }
        CollectSideEffect(viewModel.sideEffect) { effect ->
            when (effect) {
                is SideEffect.OpenSalon -> navigateTo(Screen.SalonDetails(effect.salonId))
                is SideEffect.OpenFilters -> {
                    val request = FilterSheetRequest.next(sheetOpenings, effect.filters)
                    sheetOpenings = request.key
                    sheet = request
                }
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

/**
 * One opening of S05. The key must grow on every opening, also after the sheet closed: the sheet view model is
 * cached per key in the destination's store, so a reused key reopens the sheet with stale selections (CUS-092).
 */
internal data class FilterSheetRequest(val filters: SalonFilters, val key: Int) {
    companion object {
        fun next(lastKey: Int, filters: SalonFilters) = FilterSheetRequest(filters, lastKey + 1)
    }
}
