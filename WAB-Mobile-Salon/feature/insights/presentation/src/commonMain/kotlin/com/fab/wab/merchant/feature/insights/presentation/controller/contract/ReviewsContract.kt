package com.fab.wab.merchant.feature.insights.presentation.controller.contract

import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.config.ContactInfo
import com.fab.wab.merchant.feature.insights.domain.Review
import com.fab.wab.merchant.feature.insights.domain.ReviewStaff
import com.fab.wab.merchant.feature.insights.domain.ReviewSummary
import com.fab.wab.merchant.feature.insights.domain.ReviewTarget

sealed interface ReviewsContract {
    /** [staffId] = the chosen staff member on the staff tab (null = all staff); [reporting] = review being reported. */
    data class UiState(
        val target: ReviewTarget = ReviewTarget.SALON,
        val staffId: String? = null,
        val staffOptions: List<ReviewStaff> = emptyList(),
        val reviews: List<Review> = emptyList(),
        val summary: ReviewSummary = ReviewSummary.EMPTY,
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val error: String? = null,
        val branchScope: BranchScope = BranchScope(),
        val contact: ContactInfo? = null,
        val reporting: Review? = null,
    ) {
        val isEmpty: Boolean get() = !loading && error == null && reviews.isEmpty()
        val showsStaffSelector: Boolean get() = target == ReviewTarget.STAFF && staffOptions.isNotEmpty()
    }

    sealed interface UiAction {
        data class OnTarget(val target: ReviewTarget) : UiAction
        data class OnStaff(val staffId: String?) : UiAction
        data class OnBranchSelect(val branchId: String?) : UiAction
        data object OnLoadMore : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data class OnReport(val reviewId: String) : UiAction
        data object OnDismissReport : UiAction
        data object OnReportCall : UiAction
        data object OnReportWhatsApp : UiAction
        data object OnReportEmail : UiAction
    }

    sealed interface SideEffect {
        data class Dial(val phone: String) : SideEffect

        /** Contact WAB prefilled with the review reference (PRD M20 Report); the navigation builds the localized text. */
        data class WhatsAppReport(val phone: String, val reviewId: String) : SideEffect
        data class EmailReport(val address: String, val reviewId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
