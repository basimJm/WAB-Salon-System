package com.fab.wab.merchant.feature.finance.presentation.controller.contract

import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.feature.finance.domain.FinanceBalance
import com.fab.wab.merchant.feature.finance.domain.FinanceRange
import com.fab.wab.merchant.feature.finance.domain.FinanceTab
import com.fab.wab.merchant.feature.finance.domain.Payout
import com.fab.wab.merchant.feature.finance.domain.Refund
import com.fab.wab.merchant.feature.finance.domain.Transaction
import kotlinx.datetime.LocalDate

sealed interface FinanceContract {
    data class UiState(
        val balance: FinanceBalance? = null,
        val canManageBank: Boolean = false,
        val tab: FinanceTab = FinanceTab.TRANSACTIONS,
        val range: FinanceRange = FinanceRange.THIS_MONTH,
        val from: LocalDate,
        val to: LocalDate,
        val transactions: List<Transaction> = emptyList(),
        val refunds: List<Refund> = emptyList(),
        val payouts: List<Payout> = emptyList(),
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val error: String? = null,
        val branchScope: BranchScope = BranchScope(),
    ) {
        /** Payouts are salon-wide; transactions and refunds can be narrowed to one branch (MER-064). */
        val showsBranchSwitcher: Boolean get() = branchScope.showsSwitcher && tab != FinanceTab.PAYOUTS

        val isEmpty: Boolean
            get() = !loading && error == null && when (tab) {
                FinanceTab.TRANSACTIONS -> transactions.isEmpty()
                FinanceTab.REFUNDS -> refunds.isEmpty()
                FinanceTab.PAYOUTS -> payouts.isEmpty()
            }

        /** Rows of any tab are on screen: a failed load keeps them and shows a banner instead of the error state. */
        val hasRows: Boolean get() = transactions.isNotEmpty() || refunds.isNotEmpty() || payouts.isNotEmpty()
    }

    sealed interface UiAction {
        data class OnTab(val tab: FinanceTab) : UiAction
        data class OnRange(val range: FinanceRange) : UiAction
        data class OnFrom(val date: LocalDate) : UiAction
        data class OnTo(val date: LocalDate) : UiAction
        data object OnLoadMore : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data class OnBranchSelect(val branchId: String?) : UiAction
        data object OnBank : UiAction
        data class OnBooking(val bookingId: String) : UiAction
    }

    sealed interface SideEffect {
        data object OpenBank : SideEffect
        data class OpenBooking(val bookingId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
