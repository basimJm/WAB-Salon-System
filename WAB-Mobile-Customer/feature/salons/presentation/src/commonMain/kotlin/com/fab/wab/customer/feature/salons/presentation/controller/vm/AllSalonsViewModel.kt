package com.fab.wab.customer.feature.salons.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonQuery
import com.fab.wab.customer.core.domain.salon.SalonQueryDefaults
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionOutcome
import com.fab.wab.customer.feature.salons.domain.model.SearchSuggestions
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SalonsDialog
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiState
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterChipId
import com.fab.wab.customer.feature.salons.presentation.controller.contract.QuickChip
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * S04 search (BUSINESS_DOMAIN §5.22): text (debounced) with grouped suggestions, recent searches on the device, the type
 * lens, quick chips and the S05 filters in one query, paged by 10; nearest needs a location. No gender unless filtered.
 */
@OptIn(FlowPreview::class)
class AllSalonsViewModel(
    entry: AllSalonsEntry,
    private val deps: AllSalonsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(
    initialState = UiState(filters = entry.toFilters()),
    testScope,
) {

    private var started = false
    private var loadJob: Job? = null
    private var suggestionsJob: Job? = null
    private val typed = MutableStateFlow("")

    override fun onStart() {
        if (started) return
        started = true
        scope.launch {
            val session = deps.sessionStore.state.first()
            updateState { copy(signedIn = session.isSignedIn) }
            load()
        }
        scope.launch { deps.recentSearches.recent.collect { updateState { copy(recent = it) } } }
        scope.launch {
            typed.drop(1).debounce(deps.debounceMs).distinctUntilChanged().collect { text ->
                track(SalonsAnalytics.ACTION_SEARCH, SalonsAnalytics.PARAM_HAS_TEXT to text.isNotBlank().toString())
                load()
                loadSuggestions(text)
            }
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnTextChange -> {
                updateState { copy(text = event.value, suggesting = true) }
                typed.value = event.value.trim()
            }
            UiAction.OnSearchSubmit -> submit(uiState.value.text)
            is UiAction.OnRecentClick -> submit(event.text, fromRecent = true)
            UiAction.OnRecentClear -> scope.launch { deps.recentSearches.clear() }
            is UiAction.OnSuggestedServiceClick -> {
                track(SalonsAnalytics.ACTION_SUGGESTION, SalonsAnalytics.PARAM_ID to event.service.id)
                saveRecent(event.service.name)
                val service = ServiceRef(event.service.id, event.service.name)
                updateState { copy(suggesting = false, filters = filters.withService(service)) }
                search("")
            }
            is UiAction.OnSuggestedPlaceClick -> {
                track(SalonsAnalytics.ACTION_SUGGESTION, SalonsAnalytics.PARAM_ID to event.salonId)
                saveRecent(uiState.value.text)
                emitSideEffect(SideEffect.OpenSalon(event.salonId))
            }
            UiAction.OnFilterClick -> openFilters()
            is UiAction.OnLensSelect -> applyFilters(uiState.value.filters.withLens(event.type))
            is UiAction.OnQuickChip -> quickChip(event.chip)
            is UiAction.OnChipRemove -> removeChip(event.chip)
            is UiAction.OnFiltersApplied -> applyFilters(event.filters)
            is UiAction.OnSalonClick -> {
                track(SalonsAnalytics.ACTION_SALON_CLICK, SalonsAnalytics.PARAM_ID to event.salonId)
                emitSideEffect(SideEffect.OpenSalon(event.salonId))
            }
            is UiAction.OnFavoriteClick -> toggleFavorite(event.salonId)
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load()
            UiAction.OnDialogConfirm -> confirmDialog()
            UiAction.OnDialogDismiss -> updateState { copy(dialog = null) }
        }
    }

    private fun openFilters() {
        track(SalonsAnalytics.ACTION_FILTER_OPEN)
        emitSideEffect(SideEffect.OpenFilters(uiState.value.filters))
    }

    /** A new filter set: "Open now" alone is applied on the device, everything else reloads the first page. */
    private fun applyFilters(filters: SalonFilters) {
        val previous = uiState.value.filters
        if (filters == previous) return
        if (filters.businessTypes != previous.businessTypes) {
            val codes = filters.businessTypes.joinToString(SalonsAnalytics.LIST_SEPARATOR) { it.code }.ifEmpty { SalonsAnalytics.VALUE_ALL }
            track(SalonsAnalytics.ACTION_BUSINESS_TYPE, SalonsAnalytics.PARAM_VALUE to codes)
        }
        updateState { copy(filters = filters) }
        if (filters.copy(openNow = previous.openNow) != previous) load()
    }

    private fun quickChip(chip: QuickChip) {
        track(SalonsAnalytics.ACTION_QUICK_CHIP, SalonsAnalytics.PARAM_FILTER to chip.name.lowercase())
        if (chip == QuickChip.PRICE) openFilters() else applyFilters(uiState.value.filters.toggle(chip))
    }

    private fun removeChip(chip: FilterChipId) {
        track(SalonsAnalytics.ACTION_FILTER_REMOVE, SalonsAnalytics.PARAM_FILTER to chip.toString())
        applyFilters(uiState.value.filters.without(chip))
    }

    /** Submit (keyboard search or a recent search): hides the suggestions, keeps the text on the device, shows results. */
    private fun submit(text: String, fromRecent: Boolean = false) {
        val trimmed = text.trim()
        updateState { copy(suggesting = false) }
        saveRecent(trimmed)
        if (fromRecent) search(trimmed)
    }

    /** Sets the search text at once: the debounced flow loads it; the same text as before reloads directly. */
    private fun search(text: String) {
        updateState { copy(text = text) }
        if (typed.value == text) load() else typed.value = text
    }

    private fun saveRecent(text: String) {
        if (text.isBlank()) return
        scope.launch { deps.recentSearches.add(text) }
    }

    private fun loadSuggestions(text: String) {
        suggestionsJob?.cancel()
        suggestionsJob = scope.launch {
            when (val result = deps.suggestions(text, uiState.value.filters)) {
                is AppResult.Success -> updateState { copy(suggestions = result.data) }
                // Suggestions are an aid: a failure leaves the results list, which shows its own error state.
                is AppResult.Error -> updateState { copy(suggestions = SearchSuggestions.NONE) }
                AppResult.Loading -> Unit
            }
        }
    }

    /** First page (or pull-to-refresh) for the current text + filters; cancels any page in flight. */
    private fun load(refresh: Boolean = false) {
        loadJob?.cancel()
        loadJob = scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, loadingMore = false, error = null, offline = false) }
            val location = locationForNearest() ?: return@launch
            val query = SalonQuery(uiState.value.text, uiState.value.filters, location.value)
            when (val result = deps.searchSalons(query)) {
                is AppResult.Success -> updateState {
                    copy(
                        loading = false, refreshing = false, loaded = true,
                        salons = result.data, hasMore = result.data.size >= query.pageSize,
                    )
                }
                is AppResult.Error -> fail(result.appError, keepContent = refresh)
                AppResult.Loading -> Unit
            }
        }
    }

    private fun loadMore() {
        val current = uiState.value
        if (current.loadingMore || !current.hasMore || current.loading) return
        loadJob = scope.launch {
            updateState { copy(loadingMore = true) }
            val location = locationForNearest() ?: return@launch
            val page = current.salons.size / SalonQueryDefaults.PAGE_SIZE + SalonQueryDefaults.FIRST_PAGE
            val query = SalonQuery(current.text, current.filters, location.value, page = page)
            when (val result = deps.searchSalons(query)) {
                is AppResult.Success -> updateState {
                    copy(loadingMore = false, salons = salons + result.data, hasMore = result.data.size >= query.pageSize)
                }
                is AppResult.Error -> {
                    updateState { copy(loadingMore = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private suspend fun fail(error: AppError, keepContent: Boolean) {
        val message = deps.errorText(error)
        updateState {
            copy(
                loading = false, refreshing = false, offline = error is AppError.NetworkError,
                error = if (keepContent && loaded) null else message,
            )
        }
        if (keepContent && uiState.value.loaded) emitSideEffect(SideEffect.ShowError(message))
    }

    /**
     * Nearest needs coordinates (PRD S04): with them → the fix; without the permission → the Home flow starts and
     * this load stops (null) until the user answers; any other filter → no location (Located(null)).
     */
    private suspend fun locationForNearest(): Located? {
        if (uiState.value.filters.general != GeneralFilter.NEAREST) return Located(null)
        if (deps.permissions.isGranted(AppPermission.LOCATION) && deps.permissions.isLocationServiceEnabled()) {
            return Located(deps.currentLocation())
        }
        updateState { copy(loading = false, refreshing = false, dialog = SalonsDialog.LocationExplanation) }
        return null
    }

    private fun confirmDialog() {
        val dialog = uiState.value.dialog
        updateState { copy(dialog = null) }
        when (dialog) {
            SalonsDialog.LocationExplanation -> scope.launch { requestLocation() }
            SalonsDialog.LocationDenied -> {
                deps.permissions.openSettings(AppPermission.LOCATION)
                dropNearest()
            }
            SalonsDialog.AuthRequired -> emitSideEffect(SideEffect.OpenLogin)
            null -> Unit
        }
    }

    private suspend fun requestLocation() {
        when (deps.permissions.ensure(AppPermission.LOCATION)) {
            PermissionOutcome.Granted -> if (deps.permissions.isLocationServiceEnabled()) load() else dropNearest()
            PermissionOutcome.Denied -> dropNearest()
            PermissionOutcome.BlockedInSettings -> updateState { copy(dialog = SalonsDialog.LocationDenied) }
        }
    }

    /** PRD S04: not granted → remove the Nearest filter and inform the user. */
    private fun dropNearest() {
        updateState { copy(filters = filters.copy(general = null)) }
        emitSideEffect(SideEffect.NearestDropped)
        load()
    }

    private fun toggleFavorite(salonId: String) {
        if (!uiState.value.signedIn) {
            updateState { copy(dialog = SalonsDialog.AuthRequired) }
            return
        }
        val current = uiState.value.salons.firstOrNull { it.id == salonId } ?: return
        val target = !current.isFavorite
        setFavorite(salonId, target)
        scope.launch {
            when (val result = deps.favorites.setFavorite(salonId, target)) {
                is AppResult.Success -> setFavorite(salonId, result.data)
                is AppResult.Error -> {
                    setFavorite(salonId, !target)
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun setFavorite(salonId: String, value: Boolean) = updateState {
        copy(salons = salons.map { if (it.id == salonId) it.copy(isFavorite = value) else it })
    }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }

    private class Located(val value: LocationData?)
}
