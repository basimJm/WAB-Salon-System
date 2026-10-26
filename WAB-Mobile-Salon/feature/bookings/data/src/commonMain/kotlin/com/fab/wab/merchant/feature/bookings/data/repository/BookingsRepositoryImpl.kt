package com.fab.wab.merchant.feature.bookings.data.repository

import com.fab.wab.merchant.core.data.contract.generated.PostBookingsByIdCancelBody
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsByIdReassignBody
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsByIdRejectBody
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.bookings.data.remote.BookingsApi
import com.fab.wab.merchant.feature.bookings.domain.model.BookingDetails
import com.fab.wab.merchant.feature.bookings.domain.model.BookingQuery
import com.fab.wab.merchant.feature.bookings.domain.model.BookingSummary
import com.fab.wab.merchant.feature.bookings.domain.model.ResponseReason
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository

private const val NOT_FOUND_STATUS = 404

class BookingsRepositoryImpl(private val api: BookingsApi) : BookingsRepository {
    override suspend fun list(query: BookingQuery, page: Int, pageSize: Int): AppResult<List<BookingSummary>> =
        safeApiCall { api.list(query, page, pageSize) }.mapSuccess { response -> response.data.mapNotNull { it.toDomain() } }

    override suspend fun details(bookingId: String): AppResult<BookingDetails> =
        when (val result = safeApiCall { api.details(bookingId) }) {
            is AppResult.Success -> result.data.data.toDomain()?.let { AppResult.Success(it) }
                ?: AppResult.Error(AppError.ServerError(ErrorCode.NOT_FOUND, NOT_FOUND_STATUS, null))
            is AppResult.Error -> result
            AppResult.Loading -> AppResult.Loading
        }

    override suspend fun approve(bookingId: String) = safeApiCall { api.approve(bookingId) }.mapSuccess { }

    override suspend fun reject(bookingId: String, reason: ResponseReason, text: String?) =
        safeApiCall {
            api.reject(bookingId, PostBookingsByIdRejectBody(reason.name, text?.trim()?.takeIf { it.isNotEmpty() }))
        }.mapSuccess { }

    override suspend fun cancel(bookingId: String, reason: ResponseReason, text: String?) =
        safeApiCall {
            api.cancel(bookingId, PostBookingsByIdCancelBody(reason.name, text?.trim()?.takeIf { it.isNotEmpty() }))
        }.mapSuccess { }

    override suspend fun complete(bookingId: String) = safeApiCall { api.complete(bookingId) }.mapSuccess { }

    override suspend fun noShow(bookingId: String) = safeApiCall { api.noShow(bookingId) }.mapSuccess { }

    override suspend fun reassign(bookingId: String, personIndex: Int, staffId: String) =
        safeApiCall { api.reassign(bookingId, PostBookingsByIdReassignBody(personIndex, staffId)) }.mapSuccess { }

    override suspend fun eligibleStaff(bookingId: String, personIndex: Int): AppResult<List<StaffRef>> =
        safeApiCall { api.eligibleStaff(bookingId, personIndex) }.mapSuccess { response ->
            response.data.map { StaffRef(it.staffId, it.name) }
        }

    /**
     * Every page of `GET /team/members` (the server answers 10 per page by default; e2e: the 11th and 12th providers
     * were missing from the staff filter and the calendar columns).
     */
    override suspend fun staff(): AppResult<List<StaffRef>> {
        val all = mutableListOf<StaffRef>()
        for (page in TeamPaging.FIRST_PAGE..TeamPaging.MAX_PAGES) {
            when (val result = safeApiCall { api.team(page, TeamPaging.PAGE_SIZE) }) {
                is AppResult.Success -> {
                    val rows = result.data.data
                    all += rows.filter { it.active && it.providesServices }.map { it.toStaff() }
                    if (rows.size < TeamPaging.PAGE_SIZE) break
                }
                is AppResult.Error -> return result
                AppResult.Loading -> return AppResult.Loading
            }
        }
        return AppResult.Success(all)
    }
}

/** `GET /team/members` paging: the contract's largest page, and a ceiling against a server that never ends. */
internal object TeamPaging {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 100
    const val MAX_PAGES = 20
}
