package com.fab.wab.merchant.feature.branches.presentation.controller.contract

import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchLimits

/** Close refused with `409 BRANCH_HAS_UPCOMING_BOOKINGS`: the bookings that must be handled first. */
data class BlockingBookings(val branchId: String, val bookingIds: List<String>)

/** What a successful action did (for the confirmation banner). */
enum class BranchOutcome { MAIN_SET, OFFLINE, ONLINE, CLOSED }

sealed interface BranchesContract {
    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val error: String? = null,
        val branches: List<Branch> = emptyList(),
        val offlineFor: String? = null,
        val offlineReason: String = "",
        val confirmClose: String? = null,
        val confirmMain: String? = null,
        val blocking: BlockingBookings? = null,
        val busy: Set<String> = emptySet(),
    ) {
        val canSendOffline: Boolean get() = offlineReason.isNotBlank() && offlineReason.length <= BranchLimits.OFFLINE_REASON_MAX
    }

    sealed interface UiAction {
        data object OnAdd : UiAction
        data class OnEdit(val id: String) : UiAction
        data class OnSetMain(val id: String) : UiAction
        data object OnConfirmMain : UiAction
        data class OnOffline(val id: String) : UiAction
        data class OnOfflineReason(val value: String) : UiAction
        data object OnConfirmOffline : UiAction
        data class OnOnline(val id: String) : UiAction
        data class OnClose(val id: String) : UiAction
        data object OnConfirmClose : UiAction
        data class OnOpenBooking(val bookingId: String) : UiAction
        data object OnDismiss : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
    }

    sealed interface SideEffect {
        data object AddBranch : SideEffect
        data class EditBranch(val id: String) : SideEffect
        data class OpenBooking(val bookingId: String) : SideEffect
        data class Done(val outcome: BranchOutcome) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
