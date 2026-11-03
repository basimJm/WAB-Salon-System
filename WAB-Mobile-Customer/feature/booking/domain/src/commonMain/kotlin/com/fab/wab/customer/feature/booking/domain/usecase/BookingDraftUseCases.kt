package com.fab.wab.customer.feature.booking.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.upload.UploadPurpose
import com.fab.wab.customer.core.domain.upload.UploadsRepository
import com.fab.wab.customer.core.domain.upload.uploadConfirmed
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

/** §5.23: presign (`BOOKING_REFERENCE`) → upload → confirm; returns the key the draft sends for the person. */
class UploadReferenceImageUseCase(private val uploads: UploadsRepository) {
    suspend operator fun invoke(bytes: ByteArray, contentType: String): AppResult<String> =
        uploads.uploadConfirmed(UploadPurpose.BOOKING_REFERENCE, bytes, contentType)
}

class GetBookingDraftUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(draftId: String): AppResult<BookingDraft> = repository.get(draftId)
}

class DeleteBookingDraftUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(draftId: String): AppResult<Unit> = repository.delete(draftId)
}

class VerifyBookingOtpUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(draftId: String, otpToken: String): AppResult<String> = repository.verifyOtp(draftId, otpToken)
}

class CreateBookingUseCase(private val repository: BookingDraftRepository) {
    suspend operator fun invoke(draftId: String): AppResult<CreatedBooking> = repository.createBooking(draftId)
}
