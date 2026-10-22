package com.fab.wab.customer.feature.salon.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.salon.domain.model.ReviewDefaults
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.domain.usecase.LoadReviewsUseCase
import com.fab.wab.customer.feature.salon.domain.usecase.SubmitReviewUseCase
import com.fab.wab.customer.feature.salon.domain.usecase.reviewDraftOf
import com.fab.wab.customer.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.ReviewForm
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.SideEffect
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class ReviewsDependencies(
    val loadReviews: LoadReviewsUseCase,
    val submitReview: SubmitReviewUseCase,
    val sessionStore: SessionStore,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S08 / S09: paged approved reviews + the auth-gated add-review form (PENDING until approval). */
class ReviewsViewModel(
    target: ReviewTarget,
    private val openForm: Boolean,
    private val deps: ReviewsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(target), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        scope.launch {
            deps.sessionStore.state.collect { session ->
                updateState { copy(signedIn = session.isSignedIn) }
            }
        }
        load()
        if (openForm) scope.launch { addReview() }
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnRetry -> load()
            UiAction.OnRefresh -> load(refresh = true)
            UiAction.OnLoadMore -> loadMore()
            UiAction.OnAddReviewClick -> scope.launch { addReview() }
            is UiAction.OnRatingChange -> updateForm { copy(rating = event.rating) }
            is UiAction.OnCommentChange -> updateForm { copy(comment = event.comment.take(ReviewDefaults.MAX_COMMENT_LENGTH)) }
            UiAction.OnSubmit -> submit()
            UiAction.OnFormDismiss -> updateState { copy(form = null) }
            UiAction.OnDialogConfirm -> {
                updateState { copy(authDialog = false) }
                emitSideEffect(SideEffect.OpenLogin)
            }
            UiAction.OnDialogDismiss -> updateState { copy(authDialog = false) }
        }
    }

    private suspend fun addReview() {
        val signedIn = deps.sessionStore.state.first().isSignedIn
        if (signedIn) updateState { copy(form = ReviewForm()) } else updateState { copy(authDialog = true) }
    }

    private fun updateForm(transform: ReviewForm.() -> ReviewForm) = updateState { copy(form = form?.transform()) }

    private fun load(refresh: Boolean = false) {
        scope.launch {
            updateState { copy(loading = !refresh, refreshing = refresh, error = null, offline = false) }
            when (val result = deps.loadReviews(uiState.value.target, ReviewDefaults.FIRST_PAGE)) {
                is AppResult.Success -> updateState {
                    copy(
                        loading = false, refreshing = false, loaded = true,
                        summary = result.data.summary, items = result.data.items,
                        hasMore = result.data.items.size >= ReviewDefaults.PAGE_SIZE,
                    )
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
        scope.launch {
            updateState { copy(loadingMore = true) }
            val page = current.items.size / ReviewDefaults.PAGE_SIZE + ReviewDefaults.FIRST_PAGE
            when (val result = deps.loadReviews(current.target, page)) {
                is AppResult.Success -> updateState {
                    val more = result.data.items.size >= ReviewDefaults.PAGE_SIZE
                    copy(loadingMore = false, items = items + result.data.items, hasMore = more)
                }
                is AppResult.Error -> {
                    updateState { copy(loadingMore = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun submit() {
        val form = uiState.value.form ?: return
        val draft = reviewDraftOf(form.rating, form.comment) ?: return
        if (form.submitting) return
        updateForm { copy(submitting = true) }
        scope.launch {
            when (val result = deps.submitReview(uiState.value.target, draft)) {
                is AppResult.Success -> {
                    val params = analyticsParams { text(SalonAnalytics.PARAM_VALUE, draft.rating.toString()) }
                    deps.analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_REVIEW_SUBMIT, params))
                    updateForm { copy(submitting = false, submitted = true) }
                    emitSideEffect(SideEffect.Submitted)
                }
                is AppResult.Error -> {
                    updateForm { copy(submitting = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }
}
