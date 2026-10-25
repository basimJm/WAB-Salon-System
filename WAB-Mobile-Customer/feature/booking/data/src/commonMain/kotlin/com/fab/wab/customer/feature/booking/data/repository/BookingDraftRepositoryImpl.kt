package com.fab.wab.customer.feature.booking.data.repository

import com.fab.wab.customer.core.data.contract.generated.PostBookingsBody
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsByIdVerifyOtpBody
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.booking.data.remote.BookingDraftApi
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.CreatedBooking
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.repository.BookingDraftRepository

class BookingDraftRepositoryImpl(private val api: BookingDraftApi) : BookingDraftRepository {
    private companion object {
        /** Diagnostic only (the UI shows the generic error text): a draft person reached the summary without a slot. */
        const val MISSING_SLOT = "draft person without a slot start"
    }

    override suspend fun create(
        salonId: String,
        branchId: String?,
        paymentMethod: PaymentMethod,
        persons: List<DraftPerson>,
    ): AppResult<BookingDraft> {
        val body = draftBodyOf(salonId, paymentMethod, persons, branchId)
            ?: return AppResult.Error(AppError.UnknownError(MISSING_SLOT))
        return safeApiCall { api.create(body) }.mapSuccess { it.data.toDomain() }
    }

    override suspend fun get(draftId: String): AppResult<BookingDraft> = safeApiCall { api.get(draftId) }.mapSuccess { it.data.toDomain() }

    override suspend fun delete(draftId: String): AppResult<Unit> = safeApiCall { api.delete(draftId) }.mapSuccess { }

    override suspend fun verifyOtp(draftId: String, idToken: String): AppResult<String> =
        safeApiCall { api.verifyOtp(draftId, PostBookingsDraftsByIdVerifyOtpBody(idToken)) }.mapSuccess { it.data.otpVerifiedAt }

    override suspend fun createBooking(draftId: String): AppResult<CreatedBooking> =
        safeApiCall { api.createBooking(PostBookingsBody(draftId)) }.mapSuccess { it.data.toDomain() }
}
