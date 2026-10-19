package com.fab.wab.customer.feature.booking.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson

/** `POST /bookings/drafts`, `GET/DELETE /bookings/drafts/{id}` (BUSINESS_DOMAIN §5.6: holds for 10 minutes). */
interface BookingDraftRepository {
    suspend fun create(salonId: String, paymentMethod: PaymentMethod, persons: List<DraftPerson>): AppResult<BookingDraft>

    suspend fun get(draftId: String): AppResult<BookingDraft>

    suspend fun delete(draftId: String): AppResult<Unit>
}
