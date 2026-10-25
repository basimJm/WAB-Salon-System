package com.fab.wab.merchant.feature.bookings.presentation.controller.contract

import com.fab.wab.merchant.feature.bookings.domain.model.BookingAction
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef

/** The open action sheet / dialog of M09. */
sealed interface DetailsDialog {
    /** Reject (pending) or cancel (approved): a reason is required, OTHER needs a text. */
    data class Reason(val action: BookingAction, val selected: ResponseReason? = null, val text: String = "") : DetailsDialog

    /** Complete & paid or no-show confirmation. */
    data class Confirm(val action: BookingAction) : DetailsDialog

    /** Reassign one person to another provider. */
    data class Reassign(val personIndex: Int = 0, val staffId: String? = null) : DetailsDialog

    /** Another member handled the booking first (`ALREADY_HANDLED`): details refresh. */
    data object AlreadyHandled : DetailsDialog
}

sealed interface BookingDetailsContract {
    data class UiState(
        val loading: Boolean = true,
        val refreshing: Boolean = false,
        val details: BookingDetails? = null,
        val error: String? = null,
        val dialog: DetailsDialog? = null,
        val acting: BookingAction? = null,
        val staffOptions: List<StaffRef> = emptyList(),
        val nowMs: Long = 0L,
    ) {
        val actions: Set<BookingAction> get() = details?.actions.orEmpty()
    }

    sealed interface UiAction {
        data object OnRefresh : UiAction
        data object OnRetry : UiAction
        data class OnActionClick(val action: BookingAction) : UiAction
        data class OnReasonSelect(val reason: ResponseReason) : UiAction
        data class OnReasonText(val value: String) : UiAction
        data class OnReassignPerson(val index: Int) : UiAction
        data class OnReassignStaff(val staffId: String) : UiAction
        data object OnDialogConfirm : UiAction
        data object OnDialogDismiss : UiAction
        data object OnCallCustomer : UiAction
        data object OnWhatsAppCustomer : UiAction
        data object OnCopyReference : UiAction
    }

    sealed interface SideEffect {
        data class Dial(val phone: String) : SideEffect
        data class WhatsApp(val phone: String) : SideEffect
        data class CopyReference(val reference: String) : SideEffect
        data class ShowMessage(val message: ActionMessage) : SideEffect
        data class ShowError(val message: String) : SideEffect
    }
}

/** Success banners after an action (texts in the screen). */
enum class ActionMessage { APPROVED, REJECTED, CANCELLED, COMPLETED, NO_SHOW, REASSIGNED }
