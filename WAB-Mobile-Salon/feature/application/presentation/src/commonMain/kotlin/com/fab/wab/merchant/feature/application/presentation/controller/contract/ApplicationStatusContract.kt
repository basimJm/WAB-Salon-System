package com.fab.wab.merchant.feature.application.presentation.controller.contract

import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.feature.application.domain.model.SalonApplication

/** Which M05 variant the application is in. */
enum class ApplicationPhase { PENDING, REJECTED, APPROVED }

fun SalonApplication.phase(): ApplicationPhase = when (state) {
    SalonState.APPLICATION_PENDING -> ApplicationPhase.PENDING
    SalonState.APPLICATION_REJECTED -> ApplicationPhase.REJECTED
    SalonState.APPROVED_INCOMPLETE, SalonState.LIVE, SalonState.OFFLINE -> ApplicationPhase.APPROVED
}

sealed interface ApplicationStatusContract {
    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val application: SalonApplication? = null,
        val error: String? = null,
    ) {
        val phase: ApplicationPhase? get() = application?.phase()
    }

    sealed interface UiAction {
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data object OnPrepareProfile : UiAction
        data object OnResubmit : UiAction
        data object OnContinue : UiAction
    }

    sealed interface SideEffect {
        data object NavigateToChecklist : SideEffect
        data object NavigateToResubmit : SideEffect
        data object NavigateHome : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
