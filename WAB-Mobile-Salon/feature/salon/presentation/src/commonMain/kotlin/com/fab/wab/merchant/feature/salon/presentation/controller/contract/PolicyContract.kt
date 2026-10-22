package com.fab.wab.merchant.feature.salon.presentation.controller.contract

import com.fab.wab.merchant.feature.salon.domain.FullPaymentRefund
import com.fab.wab.merchant.feature.salon.domain.NoShowDeposit
import com.fab.wab.merchant.feature.salon.domain.NoShowFullPayment
import com.fab.wab.merchant.feature.salon.domain.PaymentOption
import com.fab.wab.merchant.feature.salon.domain.PolicyDraft
import com.fab.wab.merchant.feature.salon.domain.PolicyField
import com.fab.wab.merchant.feature.salon.domain.PolicyLimits
import com.fab.wab.merchant.feature.salon.domain.policyErrors

sealed interface PolicyContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val original: PolicyDraft = PolicyDraft(),
        val draft: PolicyDraft = PolicyDraft(),
        val isNew: Boolean = true,
        val customWindow: Boolean = false,
        val showErrors: Boolean = false,
        val saving: Boolean = false,
        val previewOpen: Boolean = false,
    ) {
        val errors: Set<PolicyField> get() = policyErrors(draft)
        val visibleErrors: Set<PolicyField> get() = if (showErrors) errors else emptySet()
        val canSave: Boolean get() = (isNew || draft != original) && !saving
        val presetWindow: Int? get() = draft.windowHours.trim().toIntOrNull()?.takeIf { !customWindow && it in PolicyLimits.WINDOW_PRESETS }
    }

    sealed interface UiAction {
        data class OnWindowPreset(val hours: Int) : UiAction
        data object OnWindowCustom : UiAction
        data class OnWindowText(val value: String) : UiAction
        data class OnOption(val option: PaymentOption) : UiAction
        data class OnDeposit(val value: String) : UiAction
        data class OnDepositRefundable(val value: Boolean) : UiAction
        data class OnFullRefund(val value: FullPaymentRefund) : UiAction
        data class OnNoShowDeposit(val value: NoShowDeposit) : UiAction
        data class OnNoShowFull(val value: NoShowFullPayment) : UiAction
        data class OnNotes(val value: String) : UiAction
        data object OnPreview : UiAction
        data object OnClosePreview : UiAction
        data object OnSave : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data object Saved : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
