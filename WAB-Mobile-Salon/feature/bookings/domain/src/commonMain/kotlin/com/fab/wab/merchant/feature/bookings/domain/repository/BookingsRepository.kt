package com.fab.wab.merchant.feature.bookings.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.domain.model.BookingQuery
import com.fab.wab.merchant.feature.bookings.domain.model.BookingSummary
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef

/** Merchant bookings (`/bookings*`); the server scopes the list to the member (`BOOKINGS_VIEW_OWN` → own only). */
interface BookingsRepository {
    suspend fun list(query: BookingQuery, page: Int, pageSize: Int): AppResult<List<BookingSummary>>

    suspend fun details(bookingId: String): AppResult<BookingDetails>

    suspend fun approve(bookingId: String): AppResult<Unit>

    suspend fun reject(bookingId: String, reason: ResponseReason, text: String?): AppResult<Unit>

    suspend fun cancel(bookingId: String, reason: ResponseReason, text: String?): AppResult<Unit>

    suspend fun complete(bookingId: String): AppResult<Unit>

    suspend fun noShow(bookingId: String): AppResult<Unit>

    suspend fun reassign(bookingId: String, personIndex: Int, staffId: String): AppResult<Unit>

    /** Active service providers of the salon (filter sheet and reassignment). */
    suspend fun staff(): AppResult<List<StaffRef>>
}
