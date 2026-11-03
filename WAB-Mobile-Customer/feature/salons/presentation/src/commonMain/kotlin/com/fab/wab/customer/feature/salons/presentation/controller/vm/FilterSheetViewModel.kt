package com.fab.wab.customer.feature.salons.presentation.controller.vm

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.catalog.CatalogDefaults
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.salons.domain.usecase.LoadFilterServicesUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.LoadPriceBoundsUseCase
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiState
import com.fab.wab.customer.feature.salons.presentation.controller.contract.toFloatRange
import com.fab.wab.customer.feature.salons.presentation.controller.contract.toggled
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class FilterSheetDependencies(
    val loadServices: LoadFilterServicesUseCase,
    val loadPriceBounds: LoadPriceBoundsUseCase,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/**
 * S05: starts from the active filters; business types (multi) come first and the service categories are the catalog of
 * the one chosen type, else of every type (paged by 10); gender Men/Women; price bounds follow types, gender and
 * services and work without services; minimum rating (BUSINESS_DOMAIN §5.22).
 */
class FilterSheetViewModel(
    initial: SalonFilters,
    private val deps: FilterSheetDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(
    initialState = UiState(
        businessTypes = initial.businessTypes,
        gender = initial.gender,
        openNow = initial.openNow,
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
    private var servicesJob: Job? = null

    override fun onStart() {
        if (started) return
        started = true
        loadServices(page = CatalogDefaults.FIRST_PAGE)
        refreshPriceBounds(keepSelection = true)
    }

    override fun handle(event: UiAction) {
        if (!handleScope(event)) handleChoices(event)
    }

    /** Type, gender and services: they change the catalog or the price bounds. */
    private fun handleScope(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnBusinessTypeToggle -> selectBusinessTypes(uiState.value.businessTypes.toggled(event.businessType))
            is UiAction.OnGenderSelect -> {
                updateState { copy(gender = if (gender == event.gender) null else event.gender) }
                refreshPriceBounds()
            }
            is UiAction.OnServiceToggle -> toggleService(event.service)
            UiAction.OnSeeMoreServices -> if (uiState.value.servicesHasMore) loadServices(uiState.value.servicesPage + 1)
            UiAction.OnRetryServices -> loadServices(uiState.value.servicesPage + 1)
            else -> return false
        }
        return true
    }

    private fun handleChoices(event: UiAction) {
        when (event) {
            is UiAction.OnPriceChange -> updateState { copy(priceSelection = event.range) }
            is UiAction.OnGeneralSelect -> updateState { copy(general = if (general == event.general) null else event.general) }
            is UiAction.OnRatingSelect -> updateState { copy(minRating = if (minRating == event.rating) null else event.rating) }
            UiAction.OnReset -> reset()
            UiAction.OnApply -> emitSideEffect(SideEffect.Applied(uiState.value.toFilters()))
            else -> Unit
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

    /** Other types have another catalog: its services replace the list and earlier picks are dropped. */
    private fun selectBusinessTypes(types: Set<BusinessType>) {
        if (types == uiState.value.businessTypes) return
        val catalogChanged = types.singleOrNull() != uiState.value.businessTypes.singleOrNull()
        updateState {
            copy(businessTypes = types, selectedServices = emptyList(), services = if (catalogChanged) emptyList() else services)
        }
        if (catalogChanged) loadServices(page = CatalogDefaults.FIRST_PAGE)
        refreshPriceBounds()
    }

    private fun reset() {
        val catalogChanged = uiState.value.businessTypes.singleOrNull() != null
        updateState {
            copy(
                businessTypes = emptySet(),
                gender = null,
                selectedServices = emptyList(),
                general = null,
                minRating = null,
                services = if (catalogChanged) emptyList() else services,
            )
        }
        if (catalogChanged) loadServices(page = CatalogDefaults.FIRST_PAGE)
        refreshPriceBounds()
    }

    private fun loadServices(page: Int) {
        servicesJob?.cancel()
        val type = uiState.value.businessTypes.singleOrNull()
        servicesJob = scope.launch {
            updateState { copy(servicesLoading = true, servicesError = null) }
            // No gender for the catalog: discovery lists every audience (§5.22); the gender filter narrows the businesses.
            when (val result = deps.loadServices(null, page, type)) {
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

    /**
     * Bounds of the scope (types, gender, selected services; none selected = every service, §5.22). The first load keeps
     * the price range the sheet opened with when it still fits the bounds.
     */
    private fun refreshPriceBounds(keepSelection: Boolean = false) {
        priceJob?.cancel()
        val opened = uiState.value.priceSelection.takeIf { keepSelection }
        priceJob = scope.launch {
            updateState { copy(priceLoading = true) }
            when (val result = deps.loadPriceBounds(uiState.value.toFilters().copy(priceRange = null))) {
                is AppResult.Success -> updateState {
                    val bounds = result.data?.takeIf { it.toFloatRange() != null }
                    val selection = bounds?.toFloatRange()?.let { opened?.within(it) ?: it }
                    copy(priceBounds = bounds, priceSelection = selection, priceLoading = false)
                }
                is AppResult.Error -> updateState { copy(priceBounds = null, priceSelection = null, priceLoading = false) }
                AppResult.Loading -> Unit
            }
        }
    }
}

/** Options of the general single-select (PRD S05 item 3); the contract has no list endpoint, so the enum is the list. */
val generalFilterOptions: List<GeneralFilter> = GeneralFilter.entries

/** The opened selection clamped into fresh bounds; null when it lies outside them. */
internal fun ClosedFloatingPointRange<Float>.within(bounds: ClosedFloatingPointRange<Float>): ClosedFloatingPointRange<Float>? {
    val low = start.coerceIn(bounds.start, bounds.endInclusive)
    val high = endInclusive.coerceIn(bounds.start, bounds.endInclusive)
    return if (low < high) low..high else null
}
