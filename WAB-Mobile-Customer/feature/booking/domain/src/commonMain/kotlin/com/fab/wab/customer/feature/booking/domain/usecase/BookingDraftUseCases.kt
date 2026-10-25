package com.fab.wab.customer.feature.booking.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.CreatedBooking
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.repository.BookingDraftRepository

class CreateBookingDraftUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(
        salonId: String,
        branchId: String?,
        paymentMethod: PaymentMethod,
        persons: List<DraftPerson>,
    ): AppResult<BookingDraft> = repository.create(salonId, branchId, paymentMethod, persons)
}

class GetBookingDraftUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(draftId: String): AppResult<BookingDraft> = repository.get(draftId)
}

class DeleteBookingDraftUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(draftId: String): AppResult<Unit> = repository.delete(draftId)
}

class VerifyBookingOtpUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(draftId: String, idToken: String): AppResult<String> = repository.verifyOtp(draftId, idToken)
}

class CreateBookingUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(draftId: String): AppResult<CreatedBooking> = repository.createBooking(draftId)
}
