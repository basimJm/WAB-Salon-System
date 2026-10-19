package com.fab.wab.customer.feature.salons.presentation.controller.vm

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.catalog.CatalogDefaults
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.salons.domain.usecase.LoadFilterServicesUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.LoadPriceBoundsUseCase
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiState
import com.fab.wab.customer.feature.salons.presentation.controller.contract.toFloatRange
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class FilterSheetDependencies(
    val loadServices: LoadFilterServicesUseCase,
    val loadPriceBounds: LoadPriceBoundsUseCase,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S05: starts from the active filters, services paged by 10, price bounds follow the selected services. */
class FilterSheetViewModel(
    initial: SalonFilters,
    private val gender: Gender,
    private val deps: FilterSheetDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(
    initialState = UiState(
        selectedServices = initial.services,
        priceBounds = initial.priceRange,
        priceSelection = initial.priceRange?.toFloatRange(),
        general = initial.general,
        minRating = initial.minRating,
    ),
    testScope,
) {

    private var started = false
    private var priceJob: Job? = null

    override fun onStart() {
        if (started) return
        started = true
        loadServices(page = CatalogDefaults.FIRST_PAGE)
        if (uiState.value.selectedServices.isNotEmpty()) refreshPriceBounds()
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnServiceToggle -> toggleService(event.service)
            UiAction.OnSeeMoreServices -> if (uiState.value.servicesHasMore) loadServices(uiState.value.servicesPage + 1)
            UiAction.OnRetryServices -> loadServices(uiState.value.servicesPage + 1)
            is UiAction.OnPriceChange -> updateState { copy(priceSelection = event.range) }
            is UiAction.OnGeneralSelect -> updateState { copy(general = if (general == event.general) null else event.general) }
            is UiAction.OnRatingSelect -> updateState { copy(minRating = if (minRating == event.rating) null else event.rating) }
            UiAction.OnReset -> reset()
            UiAction.OnApply -> emitSideEffect(SideEffect.Applied(uiState.value.toFilters()))
        }
    }

    private fun toggleService(service: ServiceRef) {
        updateState {
            val selected = if (selectedServices.any { it.id == service.id }) {
                selectedServices.filterNot { it.id == service.id }
            } else {
                selectedServices + service
            }
            copy(selectedServices = selected)
        }
        refreshPriceBounds()
    }

    private fun reset() {
        priceJob?.cancel()
        updateState { copy(selectedServices = emptyList(), priceBounds = null, priceSelection = null, general = null, minRating = null) }
    }

    private fun loadServices(page: Int) {
        scope.launch {
            updateState { copy(servicesLoading = true, servicesError = null) }
            when (val result = deps.loadServices(gender, page)) {
                is AppResult.Success -> updateState {
                    val known = services.map { it.id }.toSet()
                    val fresh = result.data.filterNot { it.id in known }.map { ServiceRef(it.id, it.name) }
                    copy(
                        services = services + fresh,
                        servicesPage = page,
                        servicesHasMore = result.data.size >= CatalogDefaults.PAGE_SIZE,
                        servicesLoading = false,
                    )
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(servicesLoading = false, servicesError = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** Bounds depend on the sum of the selected services' prices (PRD S05 rules); none selected → no section. */
    private fun refreshPriceBounds() {
        priceJob?.cancel()
        val ids = uiState.value.selectedServices.map { it.id }
        if (ids.isEmpty()) {
            updateState { copy(priceBounds = null, priceSelection = null, priceLoading = false) }
            return
        }
        priceJob = scope.launch {
            updateState { copy(priceLoading = true) }
            when (val result = deps.loadPriceBounds(gender, ids)) {
                is AppResult.Success -> updateState {
                    val bounds = result.data?.takeIf { it.toFloatRange() != null }
                    copy(priceBounds = bounds, priceSelection = bounds?.toFloatRange(), priceLoading = false)
                }
                is AppResult.Error -> updateState { copy(priceBounds = null, priceSelection = null, priceLoading = false) }
                AppResult.Loading -> Unit
            }
        }
    }
}

/** Options of the general single-select (PRD S05 item 3); the contract has no list endpoint, so the enum is the list. */
val generalFilterOptions: List<GeneralFilter> = GeneralFilter.entries
