package com.fab.wab.merchant.feature.bookings.presentation.controller.contract

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
    ) {
        val isEmpty: Boolean get() = !loading && error == null && items.isEmpty()
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
    }

    sealed interface SideEffect {
        data class OpenDetails(val id: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
