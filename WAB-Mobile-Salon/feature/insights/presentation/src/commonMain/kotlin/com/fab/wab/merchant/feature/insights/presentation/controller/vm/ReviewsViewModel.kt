package com.fab.wab.merchant.feature.insights.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.config.ContactInfo
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.insights.domain.ReviewTarget
import com.fab.wab.merchant.feature.insights.domain.ReviewsDefaults
import com.fab.wab.merchant.feature.insights.domain.ReviewsRepository
import com.fab.wab.merchant.feature.insights.domain.mergeStaff
import com.fab.wab.merchant.feature.insights.presentation.analytics.InsightsAnalytics
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.ReviewsContract.SideEffect
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.ReviewsContract.UiAction
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.ReviewsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

class ReviewsDependencies(
    val reviews: ReviewsRepository,
    val contact: Flow<ContactInfo?>,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val branchScope: Flow<BranchScope> = flowOf(BranchScope()),
    val selectBranch: (String?) -> Unit = {},
)

/**
 * PRD M20: Salon / Staff tabs (staff selector), average + count + star distribution, paginated published reviews,
 * owner branch switcher (branch members get their branch from the server), Report → Contact WAB with the review id.
 */
class ReviewsViewModel(
    private val deps: ReviewsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var page = ReviewsDefaults.FIRST_PAGE
    private var loadJob: Job? = null

    override fun onStart() {
        deps.contact.onEach { contact -> updateState { copy(contact = contact) } }.launchIn(scope)
        deps.branchScope.onEach { branches ->
            val changed = branches.filter != uiState.value.branchScope.filter
            updateState { copy(branchScope = branches) }
            if (changed) reload(refreshing = false)
        }.launchIn(scope)
        reload(refreshing = false)
    }

    override fun handle(event: UiAction) {
        handleList(event) || handleReport(event)
    }

    private fun handleList(event: UiAction): Boolean {
        when (event) {
            is UiAction.OnTarget -> if (event.target != uiState.value.target) {
                updateState { copy(target = event.target, staffId = null) }
                track(InsightsAnalytics.ACTION_REVIEWS_TAB, InsightsAnalytics.PARAM_TAB, event.target.name)
                reload(refreshing = false)
            }
            is UiAction.OnStaff -> if (event.staffId != uiState.value.staffId) {
                updateState { copy(staffId = event.staffId) }
                reload(refreshing = false)
            }
            is UiAction.OnBranchSelect -> deps.selectBranch(event.branchId)
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnRefresh -> reload(refreshing = true)
            UiAction.OnRetry -> reload(refreshing = false)
            else -> return false
        }
        return true
    }

    private fun handleReport(event: UiAction): Boolean {
        val state = uiState.value
        val review = state.reporting
        val contact = state.contact
        when (event) {
            is UiAction.OnReport -> updateState { copy(reporting = reviews.firstOrNull { it.id == event.reviewId }) }
            UiAction.OnDismissReport -> updateState { copy(reporting = null) }
            UiAction.OnReportCall -> contact?.phone?.takeIf { review != null && it.isNotBlank() }?.let { phone ->
                report(InsightsAnalytics.CHANNEL_CALL, SideEffect.Dial(phone))
            }
            UiAction.OnReportWhatsApp -> contact?.whatsapp?.takeIf { review != null && it.isNotBlank() }?.let { phone ->
                report(InsightsAnalytics.CHANNEL_WHATSAPP, SideEffect.WhatsAppReport(phone, review?.id.orEmpty()))
            }
            UiAction.OnReportEmail -> contact?.email?.takeIf { review != null && it.isNotBlank() }?.let { address ->
                report(InsightsAnalytics.CHANNEL_EMAIL, SideEffect.EmailReport(address, review?.id.orEmpty()))
            }
            else -> return false
        }
        return true
    }

    /** PRD §14 `review_report` with the channel; the sheet closes once a channel opened. */
    private fun report(channel: String, effect: SideEffect) {
        track(InsightsAnalytics.ACTION_REVIEW_REPORT, InsightsAnalytics.PARAM_CHANNEL, channel)
        updateState { copy(reporting = null) }
        emitSideEffect(effect)
    }

    private fun track(name: String, key: String, value: String) =
        deps.analytics.trackAction(AnalyticsAction(name, analyticsParams { text(key, value) }))

    /** Loads [targetPage]; returns the page's `hasMore`, or null on error. */
    private suspend fun fetch(targetPage: Int, append: Boolean): Boolean? {
        val state = uiState.value
        val memberId = state.staffId.takeIf { state.target == ReviewTarget.STAFF }
        return when (val result = deps.reviews.reviews(state.target, memberId, state.branchScope.filter, targetPage)) {
            is AppResult.Success -> {
                val data = result.data
                updateState {
                    val rows = if (append) (reviews + data.items).distinctBy { it.id } else data.items
                    copy(reviews = rows, summary = data.summary, staffOptions = mergeStaff(staffOptions, data.items))
                }
                data.hasMore
            }
            is AppResult.Error -> {
                val message = deps.errorText(result.appError)
                if (append || uiState.value.reviews.isNotEmpty()) {
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
        page = ReviewsDefaults.FIRST_PAGE
        loadJob = scope.launch {
            updateState { if (refreshing) copy(refreshing = true) else copy(loading = true, error = null, reviews = emptyList()) }
            val more = fetch(page, append = false)
            updateState { copy(loading = false, refreshing = false, hasMore = more == true) }
        }
    }

    private fun loadMore() {
        val state = uiState.value
        if (!state.hasMore || state.loadingMore || state.loading) return
        scope.launch {
            updateState { copy(loadingMore = true) }
            val more = fetch(page + 1, append = true)
            if (more != null) page += 1
            updateState { copy(loadingMore = false, hasMore = more == true) }
        }
    }
}
