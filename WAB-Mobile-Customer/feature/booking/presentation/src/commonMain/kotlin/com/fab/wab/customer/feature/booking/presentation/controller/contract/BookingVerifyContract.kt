package com.fab.wab.customer.feature.booking.presentation.controller.contract

import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft

/** PRD S16 step 6: review the held draft, verify the customer's phone by OTP, then create the booking (pay on arrival). */
sealed interface BookingVerifyContract {

    enum class Phase { LOADING, READY, PROCESSING, ERROR }

    data class UiState(
        val phase: Phase = Phase.LOADING,
        val draft: BookingDraft? = null,
        val otpVerified: Boolean = false,
        val errorMessage: String? = null,
        val expired: Boolean = false,
    )

    sealed interface UiAction {
        data object OnVerifyClick : UiAction
        data object OnRetry : UiAction
        data object OnBackToBooking : UiAction
    }

    sealed interface SideEffect {
        data class OpenOtp(val phone: PhoneNumber) : SideEffect
        data class OpenSuccess(val bookingId: String, val referenceNumber: String) : SideEffect
        data object BackToBooking : SideEffect
    }
}
