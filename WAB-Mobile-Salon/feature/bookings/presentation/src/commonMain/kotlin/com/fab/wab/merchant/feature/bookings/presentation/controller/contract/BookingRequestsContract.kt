package com.fab.wab.merchant.feature.bookings.presentation.controller.contract

import com.fab.wab.merchant.designsystem.components.booking.HandledBy
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason

/** PRD M10 in-app request host: queued pending requests over any screen. */
sealed interface BookingRequestsContract {
    data class UiState(
        val queue: List<BookingDetails> = emptyList(),
        val accepting: Boolean = false,
        val handledBy: HandledBy? = null,
        /** Reference of the request just accepted (confirmation state). */
        val acceptedReference: String? = null,
        val acceptedId: String? = null,
        val reject: DetailsDialog.Reason? = null,
        val rejecting: Boolean = false,
        val nowMs: Long = 0L,
    ) {
        val current: BookingDetails? get() = queue.firstOrNull()
        val visible: Boolean get() = current != null || acceptedReference != null
    }

    sealed interface UiAction {
        data object OnAccept : UiAction
        data object OnReject : UiAction
        data object OnViewDetails : UiAction
        data object OnNext : UiAction
        data object OnViewBooking : UiAction
        data object OnDone : UiAction
        data object OnDismiss : UiAction
        data class OnReasonSelect(val reason: ResponseReason) : UiAction
        data class OnReasonText(val value: String) : UiAction
        data object OnRejectConfirm : UiAction
        data object OnRejectDismiss : UiAction
    }

    sealed interface SideEffect {
        data class OpenDetails(val id: String) : SideEffect
        data class ShowMessage(val message: ActionMessage) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}
