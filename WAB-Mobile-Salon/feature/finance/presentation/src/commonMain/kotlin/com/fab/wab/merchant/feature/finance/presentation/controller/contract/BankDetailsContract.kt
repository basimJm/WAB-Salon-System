package com.fab.wab.merchant.feature.finance.presentation.controller.contract

import com.fab.wab.merchant.feature.finance.domain.BankDetails
import com.fab.wab.merchant.feature.finance.domain.BankDraft
import com.fab.wab.merchant.feature.finance.domain.BankField
import com.fab.wab.merchant.feature.finance.domain.bankErrors

sealed interface BankDetailsContract {
    data class UiState(
        val loading: Boolean = true,
        val error: String? = null,
        val saved: BankDetails? = null,
        val draft: BankDraft = BankDraft(),
        val showErrors: Boolean = false,
        val working: Boolean = false,
        val awaitingOtp: Boolean = false,
    ) {
        val errors: Set<BankField> get() = bankErrors(draft)
        val visibleErrors: Set<BankField> get() = if (showErrors) errors else emptySet()
    }

    sealed interface UiAction {
        data class OnBankName(val value: String) : UiAction
        data class OnHolder(val value: String) : UiAction
        data class OnIban(val value: String) : UiAction
        data object OnContinue : UiAction
        data object OnResume : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        /** Open the OTP screen for the owner's phone (purpose BANK_DETAILS). */
        data class VerifyPhone(val countryCode: String, val number: String) : SideEffect
        data object Saved : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
