package com.fab.wab.customer.feature.booking.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.CreatedBooking
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson

/** `POST /bookings/drafts`, `GET/DELETE /bookings/drafts/{id}` (BUSINESS_DOMAIN §5.6: holds for 10 minutes). */
interface BookingDraftRepository {
    /** [branchId] is the branch chosen in step 0 (BUSINESS_DOMAIN §5.18); the draft and its booking keep it. */
    suspend fun create(
        salonId: String,
        branchId: String?,
        paymentMethod: PaymentMethod,
        persons: List<DraftPerson>,
    ): AppResult<BookingDraft>

    suspend fun get(draftId: String): AppResult<BookingDraft>

    suspend fun delete(draftId: String): AppResult<Unit>

    /** `POST /bookings/drafts/{id}/verify-otp` with the Firebase ID token (purpose BOOKING_CONFIRMATION); returns `otpVerifiedAt`. */
    suspend fun verifyOtp(draftId: String, idToken: String): AppResult<String>

    /** `POST /bookings` from a verified draft. */
    suspend fun createBooking(draftId: String): AppResult<CreatedBooking>
}
