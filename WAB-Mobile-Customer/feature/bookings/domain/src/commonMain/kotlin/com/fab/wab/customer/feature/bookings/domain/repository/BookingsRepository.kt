package com.fab.wab.customer.feature.bookings.domain.repository

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.booking.BookingDetails
import com.fab.wab.customer.core.domain.booking.BookingSummary
import com.fab.wab.customer.core.domain.booking.BookingTab

object BookingsDefaults {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 10
    /** Contract: `q` ≤ 60 characters (salon name or reference number). */
    const val MAX_QUERY_LENGTH = 60
    /** PRD S14: debounced search. */
    const val SEARCH_DEBOUNCE_MS = 500L
}

/** `GET /bookings?tab&q&page&pageSize` (registered customers). */
interface BookingsRepository {
    /** `businessType` null = salons and clinics (bookings filter All / Salons / Clinics, §5.19). */
    suspend fun list(
        tab: BookingTab,
        query: String,
        page: Int,
        pageSize: Int,
        businessType: BusinessType? = null,
    ): AppResult<List<BookingSummary>>

    /** `GET /bookings/{id}`. */
    suspend fun details(bookingId: String): AppResult<BookingDetails>

    /** `POST /bookings/{id}/cancel` (whole booking, no partial cancel); answers the refund due (JOD text). */
    suspend fun cancel(bookingId: String, reasonText: String?): AppResult<String>
}
