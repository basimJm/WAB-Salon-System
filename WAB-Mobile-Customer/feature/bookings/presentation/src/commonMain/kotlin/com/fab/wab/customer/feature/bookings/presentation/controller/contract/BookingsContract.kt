package com.fab.wab.customer.feature.bookings.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.BookingTab

sealed interface BookingsContract {

    data class UiState(
        val signedIn: Boolean? = null,
        val welcomeName: String = "",
        val tab: BookingTab = BookingTab.UPCOMING,
        /** All / Salons / Clinics (null = all, §5.19). */
        val businessType: BusinessType? = null,
        val query: String = "",
        val loading: Boolean = false,
        val refreshing: Boolean = false,
        val loadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val loaded: Boolean = false,
        val bookings: List<BookingSummary> = emptyList(),
    )

    sealed interface UiAction {
        data object OnLoginClick : UiAction
        data object OnBookNowClick : UiAction
        data class OnTabSelect(val tab: BookingTab) : UiAction
        data class OnBusinessTypeSelect(val businessType: BusinessType?) : UiAction
        data class OnQueryChange(val value: String) : UiAction
        data class OnBookingClick(val bookingId: String) : UiAction
        data object OnLoadMore : UiAction
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data object OnResume : UiAction
    }

    sealed interface SideEffect {
        data object OpenLogin : SideEffect
        data object OpenHome : SideEffect
        data class OpenBooking(val bookingId: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
