package com.fab.wab.customer.feature.salon.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.feature.salon.domain.model.ReviewDefaults
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget

sealed interface ReviewsContract {

    /** The add-review form (PRD S08: rating 1–5 + optional comment ≤ 1000). */
    data class ReviewForm(
        val rating: Int = 0,
        val comment: String = "",
        val submitting: Boolean = false,
        /** S09 success panel: the sheet stays open with "Thank you" + Done until dismissed. */
        val submitted: Boolean = false,
    ) {
        val canSubmit: Boolean
            get() = rating in ReviewDefaults.MIN_RATING..ReviewDefaults.MAX_RATING &&
                comment.length <= ReviewDefaults.MAX_COMMENT_LENGTH && !submitting && !submitted
    }

    data class UiState(
        val target: ReviewTarget,
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val loaded: Boolean = false,
        val summary: RatingSummary? = null,
        val items: List<Review> = emptyList(),
        val signedIn: Boolean = false,
        val form: ReviewForm? = null,
        val authDialog: Boolean = false,
    )

    sealed interface UiAction {
        data object OnRetry : UiAction
        data object OnRefresh : UiAction
        data object OnLoadMore : UiAction
        data object OnAddReviewClick : UiAction
        data class OnRatingChange(val rating: Int) : UiAction
        data class OnCommentChange(val comment: String) : UiAction
        data object OnSubmit : UiAction
        data object OnFormDismiss : UiAction
        data object OnDialogConfirm : UiAction
        data object OnDialogDismiss : UiAction
    }

    sealed interface SideEffect {
        data object OpenLogin : SideEffect
        data object Submitted : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
