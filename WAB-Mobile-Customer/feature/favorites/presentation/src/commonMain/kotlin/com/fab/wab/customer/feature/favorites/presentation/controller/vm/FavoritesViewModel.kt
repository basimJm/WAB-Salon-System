package com.fab.wab.customer.feature.favorites.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.favorites.FavoritesDefaults
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.favorites.domain.usecase.LoadFavoritesUseCase
import com.fab.wab.customer.feature.favorites.domain.usecase.RemoveFavoriteUseCase
import com.fab.wab.customer.feature.favorites.presentation.analytics.FavoritesAnalytics
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.SideEffect
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.UiAction
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** S20: guest message, paged favorites for registered users, heart removes the card, reload on resume. */
class FavoritesViewModel(
    private val loadFavorites: LoadFavoritesUseCase,
    private val removeFavorite: RemoveFavoriteUseCase,
    private val sessionStore: SessionStore,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        scope.launch {
            sessionStore.state.collect { session ->
                val was = uiState.value.signedIn
                updateState { copy(signedIn = session.isSignedIn, salons = if (session.isSignedIn) salons else emptyList(), loaded = false) }
                if (session.isSignedIn && was != true) load()
            }
        }
    }

    override fun onEvent(event: UiAction) {
        when (event) {
            UiAction.OnLoginClick -> emitSideEffect(SideEffect.OpenLogin)
            UiAction.OnExploreClick -> {
                track(FavoritesAnalytics.ACTION_EXPLORE)
                emitSideEffect(SideEffect.OpenHome)
            }
            is UiAction.OnSalonClick -> emitSideEffect(SideEffect.OpenSalon(event.salonId))
            is UiAction.OnRemoveClick -> remove(event.salonId)
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load()
            UiAction.OnResume -> if (uiState.value.signedIn == true && uiState.value.loaded) load(refresh = true)
        }
    }

    private fun load(refresh: Boolean = false) {
        scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, error = null, offline = false) }
            when (val result = loadFavorites(FavoritesDefaults.FIRST_PAGE)) {
                is AppResult.Success -> updateState {
                    copy(loading = false, refreshing = false, loaded = true, salons = result.data, hasMore = result.data.isFull())
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    val keep = refresh && uiState.value.loaded
                    val offline = result.appError is AppError.NetworkError
                    updateState { copy(loading = false, refreshing = false, offline = offline, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun loadMore() {
        val current = uiState.value
        if (current.loadingMore || !current.hasMore || current.loading) return
        scope.launch {
            updateState { copy(loadingMore = true) }
            val page = current.salons.size / FavoritesDefaults.PAGE_SIZE + FavoritesDefaults.FIRST_PAGE
            when (val result = loadFavorites(page)) {
                is AppResult.Success -> updateState {
                    copy(loadingMore = false, salons = salons + result.data, hasMore = result.data.isFull())
                }
                is AppResult.Error -> {
                    updateState { copy(loadingMore = false) }
                    emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    /** PRD S20: tapping the heart removes the salon; optimistic, restored at its place on failure. */
    private fun remove(salonId: String) {
        val current = uiState.value.salons
        val index = current.indexOfFirst { it.id == salonId }
        if (index < 0) return
        val removed = current[index]
        track(FavoritesAnalytics.ACTION_REMOVE, FavoritesAnalytics.PARAM_ID to salonId)
        updateState { copy(salons = salons.filterNot { it.id == salonId }) }
        scope.launch {
            when (val result = removeFavorite(salonId)) {
                is AppResult.Success -> Unit
                is AppResult.Error -> {
                    updateState { copy(salons = salons.toMutableList().apply { add(index.coerceAtMost(size), removed) }) }
                    emitSideEffect(SideEffect.ShowError(errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun List<*>.isFull(): Boolean = size >= FavoritesDefaults.PAGE_SIZE

    private fun track(action: String, vararg params: Pair<String, String>) {
        analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }
}
