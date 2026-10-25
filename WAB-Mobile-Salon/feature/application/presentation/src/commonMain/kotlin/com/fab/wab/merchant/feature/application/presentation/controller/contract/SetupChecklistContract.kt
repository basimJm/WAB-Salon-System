package com.fab.wab.merchant.feature.application.presentation.controller.contract

import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.feature.application.domain.model.SetupStep
import com.fab.wab.merchant.feature.application.domain.model.SetupStepStatus
import com.fab.wab.merchant.feature.application.domain.model.requiredDone
import com.fab.wab.merchant.feature.application.domain.model.requiredTotal

sealed interface SetupChecklistContract {
    /** PRD M06: progress, required + optional steps, pending note, live success. */
    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val steps: List<SetupStepStatus> = emptyList(),
        val salonState: SalonState? = null,
        val error: String? = null,
    ) {
        val done: Int get() = steps.requiredDone
        val total: Int get() = steps.requiredTotal
        val remaining: Int get() = total - done
        val isPendingApproval: Boolean get() = salonState == SalonState.APPLICATION_PENDING
        val isLive: Boolean get() = salonState == SalonState.LIVE
    }

    sealed interface UiAction {
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data class OnStepClick(val step: SetupStep) : UiAction
        data object OnGoHome : UiAction
    }

    sealed interface SideEffect {
        data class OpenStep(val step: SetupStep) : SideEffect
        data object NavigateHome : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
