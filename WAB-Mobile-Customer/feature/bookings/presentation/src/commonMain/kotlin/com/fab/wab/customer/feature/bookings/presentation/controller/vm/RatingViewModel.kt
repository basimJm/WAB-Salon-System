package com.fab.wab.customer.feature.bookings.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.mvi.BaseViewModel
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.bookings.domain.model.RatingStep
import com.fab.wab.customer.feature.bookings.domain.model.ratingStepsOf
import com.fab.wab.customer.feature.bookings.domain.usecase.GetBookingDetailsUseCase
import com.fab.wab.customer.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.SideEffect
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiAction
import com.fab.wab.customer.feature.bookings.presentation.controller.contract.RatingContract.UiState
import com.fab.wab.customer.feature.salon.domain.model.ReviewDefaults
import com.fab.wab.customer.feature.salon.domain.model.ReviewDraft
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.domain.repository.ReviewsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class RatingDependencies(
    val getBookingDetails: GetBookingDetailsUseCase,
    val reviews: ReviewsRepository,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** S18 (CUS-049): steps come from the booking; a submit failure keeps the step so the user can retry or skip. */
class RatingViewModel(
    private val bookingId: String,
    private val deps: RatingDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var started = false

    override fun onStart() {
        if (started) return
        started = true
        load()
    }

    override fun onEvent(event: UiAction) {
        when (event) {
            UiAction.OnRetry -> load()
            is UiAction.OnRatingChange -> updateState { copy(rating = event.value.coerceIn(0, ReviewDefaults.MAX_RATING)) }
            is UiAction.OnCommentChange -> updateState { copy(comment = event.value.take(ReviewDefaults.MAX_COMMENT_LENGTH)) }
            UiAction.OnSubmit -> submit()
            UiAction.OnSkip -> skip()
            UiAction.OnDone -> emitSideEffect(SideEffect.Exit)
        }
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = deps.getBookingDetails(bookingId)) {
                is AppResult.Success -> {
                    val steps = ratingStepsOf(result.data)
                    updateState { copy(loading = false, steps = steps, stepIndex = 0, finished = steps.isEmpty()) }
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun submit() {
        val state = uiState.value
        val step = state.step ?: return
        if (!state.canSubmit) return
        track(BookingsAnalytics.ACTION_RATE_SUBMIT, step)
        scope.launch {
            updateState { copy(submitting = true) }
            val draft = ReviewDraft(state.rating, state.comment.trim().ifEmpty { null })
            when (val result = deps.reviews.submit(step.target(), draft)) {
                is AppResult.Success -> {
                    updateState { copy(submitting = false, submittedCount = submittedCount + 1) }
                    advance()
                }
                is AppResult.Error -> {
                    updateState { copy(submitting = false) }
                    emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun skip() {
        val step = uiState.value.step ?: return
        if (uiState.value.submitting) return
        track(BookingsAnalytics.ACTION_RATE_SKIP, step)
        advance()
    }

    private fun advance() {
        val state = uiState.value
        val next = state.stepIndex + 1
        if (next >= state.steps.size) {
            updateState { copy(finished = true, rating = 0, comment = "") }
        } else {
            updateState { copy(stepIndex = next, rating = 0, comment = "") }
        }
    }

    private fun track(action: String, step: RatingStep) {
        val id = when (step) {
            is RatingStep.Salon -> step.salonId
            is RatingStep.Staff -> step.memberId
        }
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { text(BookingsAnalytics.PARAM_ID, id) }))
    }
}

private fun RatingStep.target(): ReviewTarget = when (this) {
    is RatingStep.Salon -> ReviewTarget.Salon(salonId)
    is RatingStep.Staff -> ReviewTarget.Staff(salonId, memberId)
}
