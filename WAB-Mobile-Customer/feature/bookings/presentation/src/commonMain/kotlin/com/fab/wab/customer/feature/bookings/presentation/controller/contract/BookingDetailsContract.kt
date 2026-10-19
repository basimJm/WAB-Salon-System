package com.fab.wab.customer.feature.bookings.presentation.controller.contract

import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.feature.bookings.domain.model.CancellationRule
import com.fab.wab.customer.feature.bookings.domain.model.RefundOutcome

sealed interface BookingDetailsContract {

    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val offline: Boolean = false,
        val error: String? = null,
        val booking: BookingDetails? = null,
        val salonPhone: String? = null,
        val salonWhatsApp: String? = null,
        val salonImageUrl: String? = null,
        val cancellation: CancellationRule = CancellationRule.NotApplicable,
        val cancelDialog: RefundOutcome? = null,
        val cancelling: Boolean = false,
    )

    sealed interface UiAction {
        data object OnRetry : UiAction
        data object OnRefresh : UiAction
        data object OnCallClick : UiAction
        data object OnWhatsAppClick : UiAction
        data object OnRateClick : UiAction
        data object OnCancelClick : UiAction
        data object OnCancelConfirm : UiAction
        data object OnCancelDismiss : UiAction
    }

    sealed interface SideEffect {
        data class OpenRating(val bookingId: String) : SideEffect
        data class Cancelled(val refundDue: String) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
