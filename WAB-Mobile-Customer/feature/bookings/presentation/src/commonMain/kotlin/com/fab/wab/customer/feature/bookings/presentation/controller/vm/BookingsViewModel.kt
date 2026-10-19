package com.fab.wab.customer.feature.bookings.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.BookingTab
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.core.realtime.RealtimeClient
import com.fab.wab.customer.core.realtime.RealtimeEvents
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsDefaults
import com.fab.wab.customer.feature.bookings.domain.usecase.LoadBookingsUseCase
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.SideEffect
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.BookingsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch

class BookingsDependencies(
    val loadBookings: LoadBookingsUseCase,
    val sessionStore: SessionStore,
    val realtime: RealtimeClient,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val debounceMs: Long = BookingsDefaults.SEARCH_DEBOUNCE_MS,
)

/** S14: guest gate, Upcoming | Past, debounced search, paging, instant refresh on `booking.updated`. */
@OptIn(FlowPreview::class)
class BookingsViewModel(
    private val deps: BookingsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false
    private var loadJob: Job? = null
    private val typed = MutableStateFlow("")

    override fun onStart() {
        if (started) return
        started = true
        scope.launch { deps.sessionStore.state.collect(::applySession) }
        scope.launch {
            typed.drop(1).debounce(deps.debounceMs).distinctUntilChanged().collect { text ->
                track(BookingsAnalytics.ACTION_SEARCH, BookingsAnalytics.PARAM_HAS_TEXT to text.isNotBlank().toString())
                load()
            }
        }
        scope.launch {
            deps.realtime.events.filter { it.name == RealtimeEvents.BOOKING_UPDATED }.collect {
                if (uiState.value.signedIn == true && uiState.value.loaded) load(refresh = true)
            }
        }
    }

    override fun onEvent(event: UiAction) {
        when (event) {
            UiAction.OnLoginClick -> emitSideEffect(SideEffect.OpenLogin)
            UiAction.OnBookNowClick -> emitSideEffect(SideEffect.OpenHome)
            is UiAction.OnTabSelect -> selectTab(event.tab)
            is UiAction.OnQueryChange -> {
                updateState { copy(query = event.value.take(BookingsDefaults.MAX_QUERY_LENGTH)) }
                typed.value = uiState.value.query.trim()
            }
            is UiAction.OnBookingClick -> {
                track(BookingsAnalytics.ACTION_OPEN, BookingsAnalytics.PARAM_ID to event.bookingId)
                emitSideEffect(SideEffect.OpenBooking(event.bookingId))
            }
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load()
            UiAction.OnResume -> if (uiState.value.signedIn == true && uiState.value.loaded) load(refresh = true)
        }
    }

    private fun applySession(session: SessionState) {
        val was = uiState.value.signedIn
        val name = when (session) {
            is SessionState.Guest -> session.profile.nickname.orEmpty()
            is SessionState.SignedIn -> session.user.firstName
        }
        updateState {
            copy(signedIn = session.isSignedIn, welcomeName = name, bookings = if (session.isSignedIn) bookings else emptyList(), loaded = false)
        }
        if (session.isSignedIn && was != true) load()
    }

    private fun selectTab(tab: BookingTab) {
        if (tab == uiState.value.tab) return
        track(BookingsAnalytics.ACTION_TAB, BookingsAnalytics.PARAM_TAB to tab.code.lowercase())
        updateState { copy(tab = tab, bookings = emptyList(), loaded = false) }
        load()
    }

    private fun load(refresh: Boolean = false) {
        loadJob?.cancel()
        loadJob = scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, loadingMore = false, error = null, offline = false) }
            val current = uiState.value
            when (val result = deps.loadBookings(current.tab, current.query, BookingsDefaults.FIRST_PAGE)) {
                is AppResult.Success -> updateState {
                    copy(loading = false, refreshing = false, loaded = true, bookings = result.data, hasMore = result.data.isFull())
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
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
        loadJob = scope.launch {
            updateState { copy(loadingMore = true) }
            val page = current.bookings.size / BookingsDefaults.PAGE_SIZE + BookingsDefaults.FIRST_PAGE
            when (val result = deps.loadBookings(current.tab, current.query, page)) {
                is AppResult.Success -> updateState {
                    copy(loadingMore = false, bookings = bookings + result.data, hasMore = result.data.isFull())
                }
                is AppResult.Error -> {
                    updateState { copy(loadingMore = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun List<*>.isFull(): Boolean = size >= BookingsDefaults.PAGE_SIZE

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }
}
