package com.fab.wab.merchant.feature.finance.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.permission.OwnerCapability
import com.fab.wab.merchant.core.domain.permission.permissionSet
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.finance.domain.FinanceDefaults
import com.fab.wab.merchant.feature.finance.domain.FinanceRange
import com.fab.wab.merchant.feature.finance.domain.FinanceRepository
import com.fab.wab.merchant.feature.finance.domain.FinanceTab
import com.fab.wab.merchant.feature.finance.domain.dates
import com.fab.wab.merchant.feature.finance.presentation.analytics.FinanceAnalytics
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract.SideEffect
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract.UiAction
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.FinanceContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate

/** This month by default (PRD M22 date filter). */
private fun initialState(today: LocalDate): UiState {
    val (from, to) = FinanceRange.THIS_MONTH.dates(today) ?: (today to today)
    return UiState(from = from, to = to)
}

class FinanceDependencies(
    val finance: FinanceRepository,
    val session: Flow<SessionState>,
    val analytics: AnalyticsTracker,
    val today: () -> LocalDate,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** PRD M22: balance card, transactions / refunds / payouts tabs, date presets or custom range, pagination. */
class FinanceViewModel(
    private val deps: FinanceDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(
    initialState = initialState(deps.today()),
    testScope,
) {
    private var page = FinanceDefaults.FIRST_PAGE
    private var loadJob: Job? = null

    override fun onStart() {
        deps.session.onEach { session ->
            updateState { copy(canManageBank = session.permissionSet().can(OwnerCapability.PAYOUT_DETAILS_MANAGE)) }
        }.launchIn(scope)
        loadBalance()
        reload(refreshing = false)
    }

    override fun handle(event: UiAction) {
        handleFilters(event) || handleList(event)
    }

    private fun handleFilters(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnTab -> if (event.tab != uiState.value.tab) {
                updateState { copy(tab = event.tab) }
                track(FinanceAnalytics.ACTION_TAB, FinanceAnalytics.PARAM_TAB, event.tab.name)
                reload(refreshing = false)
            }
            is UiAction.OnRange -> {
                val dates = event.range.dates(deps.today())
                updateState {
                    if (dates != null) copy(range = event.range, from = dates.first, to = dates.second) else copy(range = event.range)
                }
                track(FinanceAnalytics.ACTION_RANGE, FinanceAnalytics.PARAM_RANGE, event.range.name)
                if (dates != null) reload(refreshing = false)
            }
            is UiAction.OnFrom -> {
                updateState { copy(range = FinanceRange.CUSTOM, from = event.date, to = if (to < event.date) event.date else to) }
                reload(refreshing = false)
            }
            is UiAction.OnTo -> {
                if (event.date >= uiState.value.from) {
                    updateState { copy(range = FinanceRange.CUSTOM, to = event.date) }
                    reload(refreshing = false)
                }
            }
            else -> return false
        }
        return true
    }

    private fun handleList(event: UiAction): Boolean {
        when (event) {
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnRefresh -> {
                loadBalance()
                reload(refreshing = true)
            }
            UiAction.OnRetry -> reload(refreshing = false)
            UiAction.OnBank -> if (uiState.value.canManageBank) emitSideEffect(SideEffect.OpenBank)
            is UiAction.OnBooking -> emitSideEffect(SideEffect.OpenBooking(event.bookingId))
            else -> return false
        }
        return true
    }

    private fun track(name: String, key: String, value: String) =
        deps.analytics.trackAction(AnalyticsAction(name, analyticsParams { text(key, value) }))

    private fun loadBalance() {
        scope.launch { (deps.finance.balance() as? AppResult.Success)?.let { balance -> updateState { copy(balance = balance.data) } } }
    }

    /** Loads [targetPage] of the current tab; returns the row count or null on error. */
    private suspend fun fetch(targetPage: Int, append: Boolean): Int? {
        val state = uiState.value
        val result = when (state.tab) {
            FinanceTab.TRANSACTIONS -> deps.finance.transactions(state.from, state.to, targetPage).onRows { rows ->
                updateState { copy(transactions = mergePage(transactions, rows, append) { it.id }) }
            }
            FinanceTab.REFUNDS -> deps.finance.refunds(state.from, state.to, targetPage).onRows { rows ->
                updateState { copy(refunds = mergePage(refunds, rows, append) { it.id }) }
            }
            FinanceTab.PAYOUTS -> deps.finance.payouts(state.from, state.to, targetPage).onRows { rows ->
                updateState { copy(payouts = mergePage(payouts, rows, append) { it.id }) }
            }
        }
        return when (result) {
            is AppResult.Success -> result.data.size
            is AppResult.Error -> {
                val message = deps.errorText(result.appError)
                if (append || uiState.value.hasRows) {
                    emitSideEffect(SideEffect.ShowError(message))
                } else {
                    updateState { copy(error = message) }
                }
                null
            }
            AppResult.Loading -> null
        }
    }

    private fun reload(refreshing: Boolean) {
        loadJob?.cancel()
        page = FinanceDefaults.FIRST_PAGE
        loadJob = scope.launch {
            updateState { if (refreshing) copy(refreshing = true) else copy(loading = true, error = null) }
            val count = fetch(page, append = false)
            updateState { copy(loading = false, refreshing = false, hasMore = (count ?: 0) >= FinanceDefaults.PAGE_SIZE) }
        }
    }

    private fun loadMore() {
        val state = uiState.value
        if (!state.hasMore || state.loadingMore || state.loading) return
        scope.launch {
            updateState { copy(loadingMore = true) }
            val count = fetch(page + 1, append = true)
            if (count != null) page += 1
            updateState { copy(loadingMore = false, hasMore = count != null && count >= FinanceDefaults.PAGE_SIZE) }
        }
    }
}

private inline fun <T> AppResult<List<T>>.onRows(block: (List<T>) -> Unit): AppResult<List<T>> =
    also { if (it is AppResult.Success) block(it.data) }

/** A next page is appended without duplicates (rows can shift between pages); a first page replaces the list. */
private inline fun <T> mergePage(current: List<T>, page: List<T>, append: Boolean, key: (T) -> String): List<T> =
    if (append) (current + page).distinctBy(key) else page
