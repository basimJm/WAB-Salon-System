package com.fab.wab.merchant.feature.bookings.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.bookings.domain.model.BookingFilter
import com.fab.wab.merchant.feature.bookings.domain.model.BookingQuery
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsDefaults
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

class BookingsDependencies(
    val repository: BookingsRepository,
    /** Socket / push signals that a booking changed (PRD §3 real-time): the list reloads its first page. */
    val changes: Flow<Unit>,
    /** Wall clock ticks for the pending countdowns (epoch ms). */
    val clock: Flow<Long>,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    /** BUSINESS_DOMAIN §6 branch scope (owner switcher); a fixed "own branch" scope when not provided. */
    val branchScope: Flow<BranchScope> = flowOf(BranchScope()),
    val selectBranch: (String?) -> Unit = {},
    /** The member holds `BOOKINGS_CREATE` (live with permission refreshes). */
    val canCreate: Flow<Boolean> = flowOf(false),
)

/** PRD M08 bookings list. */
@OptIn(FlowPreview::class)
class BookingsViewModel(
    private val deps: BookingsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private val typed = MutableStateFlow("")
    private var page = BookingsDefaults.FIRST_PAGE
    private var loadJob: Job? = null

    override fun onStart() {
        typed.drop(1).debounce(BookingsDefaults.SEARCH_DEBOUNCE_MS).onEach { reload() }.launchIn(scope)
        deps.changes.onEach { reload(refreshing = true) }.launchIn(scope)
        deps.clock.onEach { now -> updateState { copy(nowMs = now) } }.launchIn(scope)
        deps.branchScope.onEach { branches ->
            val changed = branches.filter != uiState.value.branchScope.filter
            updateState { copy(branchScope = branches, filter = if (changed) filter.copy(staffIds = emptySet()) else filter) }
            if (changed) reload()
        }.launchIn(scope)
        deps.canCreate.onEach { allowed -> updateState { copy(canCreate = allowed) } }.launchIn(scope)
        scope.launch { (deps.repository.staff() as? AppResult.Success)?.let { staff -> updateState { copy(staffOptions = staff.data) } } }
        reload()
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnTabSelect -> if (event.tab != uiState.value.tab) {
                updateState { copy(tab = event.tab, items = emptyList()) }
                reload()
            }
            is UiAction.OnQueryChange -> {
                updateState { copy(query = event.value) }
                typed.value = event.value
            }
            UiAction.OnFilterClick -> updateState { copy(filterOpen = true) }
            UiAction.OnFilterDismiss -> updateState { copy(filterOpen = false) }
            is UiAction.OnFilterApply -> applyFilter(event.filter)
            UiAction.OnFilterClear -> applyFilter(BookingFilter())
            is UiAction.OnBookingClick -> emitSideEffect(SideEffect.OpenDetails(event.id))
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnRefresh -> reload(refreshing = true)
            UiAction.OnRetry -> reload()
            is UiAction.OnBranchSelect -> deps.selectBranch(event.branchId)
            UiAction.OnNewBooking -> if (uiState.value.canCreate) emitSideEffect(SideEffect.OpenNewBooking)
        }
    }

    private fun applyFilter(filter: BookingFilter) {
        updateState { copy(filter = filter, filterOpen = false) }
        deps.analytics.trackAction(
            AnalyticsAction(
                BookingsAnalytics.ACTION_FILTER,
                analyticsParams { number(BookingsAnalytics.PARAM_COUNT, filter.activeCount.toLong()) },
            ),
        )
        reload()
    }

    private fun currentQuery(): BookingQuery = uiState.value.let { BookingQuery(it.tab, it.query, it.filter, it.branchScope.filter) }

    private fun reload(refreshing: Boolean = false) {
        loadJob?.cancel()
        page = BookingsDefaults.FIRST_PAGE
        loadJob = scope.launch {
            updateState { if (refreshing) copy(refreshing = true) else copy(loading = true, error = null) }
            when (val result = deps.repository.list(currentQuery(), page, BookingsDefaults.PAGE_SIZE)) {
                is AppResult.Success -> updateState {
                    copy(
                        items = result.data,
                        loading = false,
                        refreshing = false,
                        error = null,
                        hasMore = result.data.size >= BookingsDefaults.PAGE_SIZE,
                    )
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    val keep = uiState.value.items.isNotEmpty()
                    updateState { copy(loading = false, refreshing = false, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun loadMore() {
        val current = uiState.value
        if (!current.hasMore || current.loadingMore || current.loading) return
        scope.launch {
            updateState { copy(loadingMore = true) }
            when (val result = deps.repository.list(currentQuery(), page + 1, BookingsDefaults.PAGE_SIZE)) {
                is AppResult.Success -> {
                    page += 1
                    updateState {
                        copy(
                            items = (items + result.data).distinctBy { it.id },
                            loadingMore = false,
                            hasMore = result.data.size >= BookingsDefaults.PAGE_SIZE,
                        )
                    }
                }
                is AppResult.Error -> {
                    updateState { copy(loadingMore = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}
