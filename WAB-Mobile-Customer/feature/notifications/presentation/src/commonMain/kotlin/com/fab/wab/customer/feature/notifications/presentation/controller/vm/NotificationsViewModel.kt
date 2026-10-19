package com.fab.wab.customer.feature.notifications.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.notifications.domain.model.NotificationDefaults
import com.fab.wab.customer.feature.notifications.domain.model.NotificationFilters
import com.fab.wab.customer.feature.notifications.domain.usecase.LoadNotificationsUseCase
import com.fab.wab.customer.feature.notifications.domain.usecase.MarkNotificationsReadUseCase
import com.fab.wab.customer.feature.notifications.presentation.analytics.NotificationsAnalytics
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.FilterDraft
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationChip
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.SideEffect
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class NotificationsDependencies(
    val loadNotifications: LoadNotificationsUseCase,
    val markRead: MarkNotificationsReadUseCase,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S19: paged list (10), filter sheet → chips, visible items reported read in the background, tap → popup. */
class NotificationsViewModel(
    private val deps: NotificationsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false
    private var loadJob: Job? = null
    private val reported = mutableSetOf<String>()

    override fun onStart() {
        if (started) return
        started = true
        load()
    }

    override fun onEvent(event: UiAction) {
        when (event) {
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load()
            UiAction.OnLoadMore -> loadMore()
            is UiAction.OnVisible -> reportRead(event.ids)
            is UiAction.OnItemClick -> open(event.id)
            UiAction.OnPopupDismiss -> updateState { copy(selected = null) }
            UiAction.OnViewBooking -> viewBooking()
            UiAction.OnFilterClick -> openSheet()
            UiAction.OnSheetDismiss -> updateState { copy(sheet = null) }
            is UiAction.OnDraftFromChange -> updateDraft { copy(from = event.value) }
            is UiAction.OnDraftToChange -> updateDraft { copy(to = event.value) }
            is UiAction.OnDraftQueryChange -> updateDraft { copy(query = event.value.take(NotificationDefaults.MAX_QUERY_LENGTH)) }
            UiAction.OnApplyFilters -> applyFilters()
            UiAction.OnResetFilters -> resetFilters()
            is UiAction.OnChipRemove -> removeChip(event.chip)
        }
    }

    private fun openSheet() {
        val f = uiState.value.filters
        updateState { copy(sheet = FilterDraft(f.from.orEmpty(), f.to.orEmpty(), f.query)) }
    }

    private fun updateDraft(transform: FilterDraft.() -> FilterDraft) = updateState { copy(sheet = sheet?.transform()) }

    private fun applyFilters() {
        val draft = uiState.value.sheet ?: return
        if (!draft.datesValid) return
        val filters = NotificationFilters(draft.from.ifBlank { null }, draft.to.ifBlank { null }, draft.query.trim())
        track(
            NotificationsAnalytics.ACTION_FILTER_APPLY,
            NotificationsAnalytics.PARAM_HAS_TEXT to filters.query.isNotBlank().toString(),
            NotificationsAnalytics.PARAM_HAS_DATES to (filters.from != null || filters.to != null).toString(),
        )
        setFilters(filters)
    }

    private fun resetFilters() {
        track(NotificationsAnalytics.ACTION_FILTER_RESET)
        setFilters(NotificationFilters())
    }

    private fun removeChip(chip: NotificationChip) {
        val f = uiState.value.filters
        setFilters(
            when (chip) {
                NotificationChip.DATES -> f.copy(from = null, to = null)
                NotificationChip.TEXT -> f.copy(query = "")
            },
        )
    }

    private fun setFilters(filters: NotificationFilters) {
        updateState { copy(filters = filters, sheet = null, items = emptyList(), loaded = false) }
        load()
    }

    private fun open(id: String) {
        val item = uiState.value.items.firstOrNull { it.id == id } ?: return
        track(NotificationsAnalytics.ACTION_OPEN, NotificationsAnalytics.PARAM_ID to id)
        updateState { copy(selected = item) }
        reportRead(listOf(id))
    }

    private fun viewBooking() {
        val bookingId = uiState.value.selected?.bookingId ?: return
        track(NotificationsAnalytics.ACTION_VIEW_BOOKING, NotificationsAnalytics.PARAM_ID to bookingId)
        updateState { copy(selected = null) }
        emitSideEffect(SideEffect.OpenBooking(bookingId))
    }

    /** PRD S19: visible unread items are marked read in the background, once each; failures are silent. */
    private fun reportRead(ids: List<String>) {
        val items = uiState.value.items.filter { it.id in ids && !it.isRead && reported.add(it.id) }
        if (items.isEmpty()) return
        updateState { copy(items = this.items.map { if (it.id in ids) it.copy(isRead = true) else it }) }
        scope.launch {
            if (deps.markRead(items) is AppResult.Error) items.forEach { reported.remove(it.id) }
        }
    }

    private fun load(refresh: Boolean = false) {
        loadJob?.cancel()
        loadJob = scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, loadingMore = false, error = null, offline = false) }
            when (val result = deps.loadNotifications(uiState.value.filters, NotificationDefaults.FIRST_PAGE)) {
                is AppResult.Success -> updateState {
                    copy(loading = false, refreshing = false, loaded = true, items = result.data, hasMore = result.data.isFull())
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
            val page = current.items.size / NotificationDefaults.PAGE_SIZE + NotificationDefaults.FIRST_PAGE
            when (val result = deps.loadNotifications(current.filters, page)) {
                is AppResult.Success -> updateState {
                    copy(loadingMore = false, items = (items + result.data).distinctBy { it.id }, hasMore = result.data.isFull())
                }
                is AppResult.Error -> {
                    updateState { copy(loadingMore = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun List<*>.isFull(): Boolean = size >= NotificationDefaults.PAGE_SIZE

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }
}
