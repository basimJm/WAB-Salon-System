package com.fab.wab.customer.feature.booking.presentation.controller.contract

/** PRD S17: success message, copyable reference number, View booking → S15, Back to Home. */
sealed interface BookingSuccessContract {

    data class UiState(val bookingId: String = "", val referenceNumber: String = "")

    sealed interface UiAction {
        data object OnCopyReference : UiAction
        data object OnViewBooking : UiAction
        data object OnBackHome : UiAction
    }

    sealed interface SideEffect {
        data class CopyToClipboard(val text: String) : SideEffect
        data class OpenBooking(val bookingId: String) : SideEffect
        data object GoHome : SideEffect
    }
}
