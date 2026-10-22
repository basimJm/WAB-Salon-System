package com.fab.wab.customer.feature.bookings.presentation.controller.contract

import com.fab.wab.customer.feature.bookings.domain.model.RatingStep
import com.fab.wab.customer.feature.salon.domain.model.ReviewDefaults

/** PRD S18: salon step, then one step per staff member who served; each step can be skipped; reviews stay PENDING. */
sealed interface RatingContract {

    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val steps: List<RatingStep> = emptyList(),
        val stepIndex: Int = 0,
        val rating: Int = 0,
        val comment: String = "",
        val submitting: Boolean = false,
        val finished: Boolean = false,
        val submittedCount: Int = 0,
    ) {
        val step: RatingStep? get() = steps.getOrNull(stepIndex)
        val canSubmit: Boolean
            get() = rating in ReviewDefaults.MIN_RATING..ReviewDefaults.MAX_RATING &&
                comment.length <= ReviewDefaults.MAX_COMMENT_LENGTH && !submitting
    }

    sealed interface UiAction {
        data object OnRetry : UiAction
        data class OnRatingChange(val value: Int) : UiAction
        data class OnCommentChange(val value: String) : UiAction
        data object OnSubmit : UiAction
        data object OnSkip : UiAction
        data object OnDone : UiAction
    }

    sealed interface SideEffect {
        data object Exit : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
