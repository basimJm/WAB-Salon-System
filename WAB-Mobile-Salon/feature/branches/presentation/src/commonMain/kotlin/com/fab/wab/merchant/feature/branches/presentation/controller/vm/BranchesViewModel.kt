package com.fab.wab.merchant.feature.branches.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchLimits
import com.fab.wab.merchant.core.domain.branch.BranchesRepository
import com.fab.wab.merchant.core.domain.branch.blockingBookingIds
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.feature.branches.presentation.analytics.BranchesAnalytics
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BlockingBookings
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchOutcome
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.SideEffect
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.UiAction
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.UiState
import com.fab.wab.merchant.feature.branches.presentation.controller.error.branchErrorText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

/**
 * Owner branch management (MER-062, BUSINESS_DOMAIN §5.16): list, set main, offline (with a reason) / online, close
 * (refused while bookings are upcoming: the blocking bookings are listed and open M09). Writes update the shared list.
 */
class BranchesViewModel(
    private val repository: BranchesRepository,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::branchErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    override fun onStart() {
        repository.branches.onEach { updateState { copy(branches = it) } }.launchIn(scope)
        load(refresh = false)
    }

    override fun handle(event: UiAction) {
        handleList(event) || handleDialogs(event)
    }

    private fun handleList(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAdd -> emitSideEffect(SideEffect.AddBranch)
            is UiAction.OnEdit -> emitSideEffect(SideEffect.EditBranch(event.id))
            is UiAction.OnSetMain -> branch(event.id)?.takeIf { it.canBecomeMain }?.let { updateState { copy(confirmMain = it.id) } }
            is UiAction.OnOffline -> branch(event.id)?.takeIf { it.canGoOffline }?.let {
                updateState { copy(offlineFor = it.id, offlineReason = "") }
            }
            is UiAction.OnOnline -> branch(event.id)?.takeIf { it.canGoOnline }?.let { write(it.id, BranchOutcome.ONLINE) }
            is UiAction.OnClose -> branch(event.id)?.takeIf { it.canClose }?.let { updateState { copy(confirmClose = it.id) } }
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnRetry -> load(refresh = false)
            else -> return false
        }
        return true
    }

    private fun handleDialogs(event: UiAction): Boolean {
        when (event) {
            UiAction.OnConfirmMain -> uiState.value.confirmMain?.let { id ->
                updateState { copy(confirmMain = null) }
                write(id, BranchOutcome.MAIN_SET)
            }
            is UiAction.OnOfflineReason -> updateState { copy(offlineReason = event.value.take(BranchLimits.OFFLINE_REASON_MAX)) }
            UiAction.OnConfirmOffline -> uiState.value.takeIf { it.canSendOffline }?.offlineFor?.let { id ->
                updateState { copy(offlineFor = null) }
                write(id, BranchOutcome.OFFLINE)
            }
            UiAction.OnConfirmClose -> uiState.value.confirmClose?.let { id ->
                updateState { copy(confirmClose = null) }
                write(id, BranchOutcome.CLOSED)
            }
            is UiAction.OnOpenBooking -> {
                updateState { copy(blocking = null) }
                emitSideEffect(SideEffect.OpenBooking(event.bookingId))
            }
            UiAction.OnDismiss -> updateState { copy(offlineFor = null, confirmClose = null, confirmMain = null, blocking = null) }
            else -> return false
        }
        return true
    }

    private fun branch(id: String): Branch? = uiState.value.branches.firstOrNull { it.id == id }

    private fun load(refresh: Boolean) {
        scope.launch {
            updateState { if (refresh) copy(refreshing = true) else copy(loading = true, error = null) }
            when (val result = repository.refresh()) {
                is AppResult.Success -> updateState { copy(loading = false, refreshing = false, error = null) }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    val keep = uiState.value.branches.isNotEmpty()
                    updateState { copy(loading = false, refreshing = false, error = if (keep) null else message) }
                    if (keep) emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun write(id: String, outcome: BranchOutcome) {
        if (id in uiState.value.busy) return
        val reason = uiState.value.offlineReason
        scope.launch {
            updateState { copy(busy = busy + id) }
            val result = when (outcome) {
                BranchOutcome.MAIN_SET -> repository.setMain(id)
                BranchOutcome.OFFLINE -> repository.setOffline(id, reason)
                BranchOutcome.ONLINE -> repository.setOnline(id)
                BranchOutcome.CLOSED -> repository.close(id)
            }
            updateState { copy(busy = busy - id) }
            when (result) {
                is AppResult.Success -> {
                    analytics.trackAction(AnalyticsAction(actionOf(outcome)))
                    emitSideEffect(SideEffect.Done(outcome))
                }
                is AppResult.Error -> onWriteError(id, result.appError)
                AppResult.Loading -> Unit
            }
        }
    }

    private suspend fun onWriteError(id: String, error: AppError) {
        val blocking = error.blockingBookingIds()
        if (!blocking.isNullOrEmpty()) {
            analytics.trackAction(
                AnalyticsAction(
                    BranchesAnalytics.ACTION_BRANCH_CLOSE,
                    analyticsParams { number(BranchesAnalytics.PARAM_BLOCKED, blocking.size.toLong()) },
                ),
            )
            updateState { copy(blocking = BlockingBookings(id, blocking)) }
        } else {
            emitSideEffect(SideEffect.ShowError(errorText(error)))
        }
    }

    private fun actionOf(outcome: BranchOutcome): String = when (outcome) {
        BranchOutcome.MAIN_SET -> BranchesAnalytics.ACTION_BRANCH_MAIN
        BranchOutcome.OFFLINE -> BranchesAnalytics.ACTION_BRANCH_OFFLINE
        BranchOutcome.ONLINE -> BranchesAnalytics.ACTION_BRANCH_ONLINE
        BranchOutcome.CLOSED -> BranchesAnalytics.ACTION_BRANCH_CLOSE
    }
}
