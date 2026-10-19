package com.fab.wab.customer.feature.salon.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.StaffMember

sealed interface StaffSheetContract {

    data class UiState(
        val loading: Boolean = true,
        val offline: Boolean = false,
        val error: String? = null,
        val member: StaffMember? = null,
        val signedIn: Boolean = false,
        val authDialog: Boolean = false,
    )

    sealed interface UiAction {
        data object OnRetry : UiAction
        data object OnAllReviewsClick : UiAction
        data object OnAddReviewClick : UiAction
        data object OnDialogConfirm : UiAction
        data object OnDialogDismiss : UiAction
    }

    sealed interface SideEffect {
        data class OpenReviews(val salonId: String, val memberId: String) : SideEffect
        data class OpenAddReview(val salonId: String, val memberId: String) : SideEffect
        data object OpenLogin : SideEffect
    }
}
