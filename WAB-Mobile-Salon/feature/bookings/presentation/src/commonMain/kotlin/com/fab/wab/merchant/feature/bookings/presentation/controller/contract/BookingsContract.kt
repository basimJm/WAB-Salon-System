package com.fab.wab.merchant.feature.bookings.presentation.controller.contract

import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.feature.bookings.domain.model.BookingFilter
import com.fab.wab.merchant.feature.bookings.domain.model.BookingSummary
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsTab
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef

sealed interface BookingsContract {
    /** PRD M08: tabs, debounced search, filters, paging, shimmer / empty / error, live countdowns ([nowMs]). */
    data class UiState(
        val tab: BookingsTab = BookingsTab.PENDING,
        val query: String = "",
        val filter: BookingFilter = BookingFilter(),
        val items: List<BookingSummary> = emptyList(),
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val error: String? = null,
        val filterOpen: Boolean = false,
        val staffOptions: List<StaffRef> = emptyList(),
        val nowMs: Long = 0L,
        val branchScope: BranchScope = BranchScope(),
        /** "New booking" shows only with `BOOKINGS_CREATE` (BUSINESS_DOMAIN §5.20; hidden, not disabled). */
        val canCreate: Boolean = false,
    ) {
        val isEmpty: Boolean get() = !loading && error == null && items.isEmpty()

        /** Staff of the chosen branch only (MER-063); every provider when all branches are shown. */
        val visibleStaff: List<StaffRef>
            get() = branchScope.filter?.let { id -> staffOptions.filter { it.branchId == null || it.branchId == id } } ?: staffOptions

        /** The owner looking at several branches at once sees each booking's branch on its card. */
        val showsBranchOnCards: Boolean get() = branchScope.showsSwitcher && branchScope.filter == null
    }

    sealed interface UiAction {
        data class OnTabSelect(val tab: BookingsTab) : UiAction
        data class OnQueryChange(val value: String) : UiAction
        data object OnFilterClick : UiAction
        data object OnFilterDismiss : UiAction
        data class OnFilterApply(val filter: BookingFilter) : UiAction
        data object OnFilterClear : UiAction
        data class OnBookingClick(val id: String) : UiAction
        data object OnLoadMore : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data class OnBranchSelect(val branchId: String?) : UiAction
        data object OnNewBooking : UiAction
    }

    sealed interface SideEffect {
        data class OpenDetails(val id: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
        data object OpenNewBooking : SideEffect
    }
}
