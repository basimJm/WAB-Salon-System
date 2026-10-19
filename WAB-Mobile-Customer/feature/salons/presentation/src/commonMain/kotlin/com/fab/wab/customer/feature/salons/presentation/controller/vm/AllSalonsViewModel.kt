package com.fab.wab.customer.feature.salons.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonQuery
import com.fab.wab.customer.core.domain.salon.SalonQueryDefaults
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.core.ui.permission.PermissionOutcome
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSalonsUseCase
import com.fab.wab.customer.feature.salons.presentation.analytics.SalonsAnalytics
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SalonsDialog
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiState
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterChipId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class AllSalonsDependencies(
    val searchSalons: SearchSalonsUseCase,
    val currentLocation: GetCurrentLocationUseCase,
    val sessionStore: SessionStore,
    val permissions: PermissionFlow,
    val favorites: FavoritesRepository,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val debounceMs: Long = SalonQueryDefaults.SEARCH_DEBOUNCE_MS,
)

/** S04: text (debounced) + filters + gender + location in one query, paged by 10, nearest needs a location. */
@OptIn(FlowPreview::class)
class AllSalonsViewModel(
    entry: AllSalonsEntry,
    private val deps: AllSalonsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(filters = entry.toFilters()), testScope) {

    private val entryGender = entry.gender
    private var started = false
    private var loadJob: Job? = null
    private val typed = MutableStateFlow("")

    override fun onStart() {
        if (started) return
        started = true
        scope.launch {
            val session = deps.sessionStore.state.first()
            val gender = entryGender ?: session.genderScope ?: Gender.entries.first()
            updateState { copy(gender = gender, signedIn = session.isSignedIn) }
            load()
        }
        scope.launch {
            typed.drop(1).debounce(deps.debounceMs).distinctUntilChanged().collect { text ->
                track(SalonsAnalytics.ACTION_SEARCH, SalonsAnalytics.PARAM_HAS_TEXT to text.isNotBlank().toString())
                load()
            }
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnTextChange -> {
                updateState { copy(text = event.value) }
                typed.value = event.value.trim()
            }
            UiAction.OnFilterClick -> {
                track(SalonsAnalytics.ACTION_FILTER_OPEN)
                emitSideEffect(SideEffect.OpenFilters(uiState.value.filters))
            }
            is UiAction.OnChipRemove -> removeChip(event.chip)
            is UiAction.OnFiltersApplied -> {
                updateState { copy(filters = event.filters) }
                load()
            }
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

    private fun removeChip(chip: FilterChipId) {
        track(SalonsAnalytics.ACTION_FILTER_REMOVE, SalonsAnalytics.PARAM_FILTER to chip.toString())
        updateState {
            val f = filters
            copy(
                filters = when (chip) {
                    is FilterChipId.Service -> f.copy(services = f.services.filterNot { it.id == chip.serviceId })
                    FilterChipId.Price -> f.copy(priceRange = null)
                    FilterChipId.General -> f.copy(general = null)
                    FilterChipId.Rating -> f.copy(minRating = null)
                },
            )
        }
        load()
    }

    /** First page (or pull-to-refresh) for the current text + filters; cancels any page in flight. */
    private fun load(refresh: Boolean = false) {
        val gender = uiState.value.gender ?: return
        loadJob?.cancel()
        loadJob = scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, loadingMore = false, error = null, offline = false) }
            val location = locationForNearest() ?: return@launch
            val query = SalonQuery(gender, uiState.value.text, uiState.value.filters, location.value)
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
        val gender = current.gender ?: return
        if (current.loadingMore || !current.hasMore || current.loading) return
        loadJob = scope.launch {
            updateState { copy(loadingMore = true) }
            val location = locationForNearest() ?: return@launch
            val page = current.salons.size / SalonQueryDefaults.PAGE_SIZE + SalonQueryDefaults.FIRST_PAGE
            val query = SalonQuery(gender, current.text, current.filters, location.value, page = page)
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

/** PRD S04 entry table → initial filters. */
fun AllSalonsEntry.toFilters(): SalonFilters = SalonFilters(
    services = listOfNotNull(serviceId?.let { ServiceRef(it, serviceName ?: it) }),
    general = when (filter) {
        SalonListFilter.RECOMMENDED -> GeneralFilter.RECOMMENDED
        SalonListFilter.NEAREST -> GeneralFilter.NEAREST
        null -> null
    },
)
