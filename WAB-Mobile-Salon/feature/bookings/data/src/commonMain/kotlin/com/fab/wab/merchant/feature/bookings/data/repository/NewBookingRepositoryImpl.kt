package com.fab.wab.merchant.feature.bookings.data.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.bookings.data.remote.NewBookingApi
import com.fab.wab.merchant.feature.bookings.domain.model.CreatedBooking
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerLookup
import com.fab.wab.merchant.feature.bookings.domain.model.NewBookingRequest
import com.fab.wab.merchant.feature.bookings.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.bookings.domain.model.SalonServiceOption
import com.fab.wab.merchant.feature.bookings.domain.repository.NewBookingRepository

class NewBookingRepositoryImpl(private val api: NewBookingApi) : NewBookingRepository {
    override suspend fun lookup(phone: PhoneNumber): AppResult<CustomerLookup> =
        safeApiCall { api.lookup(phone.countryCode, phone.number) }.mapSuccess { it.data.toDomain() }

    /** Every page of the salon's services (same paging ceiling as the team list); inactive services are left out. */
    override suspend fun services(): AppResult<List<SalonServiceOption>> {
        val all = mutableListOf<SalonServiceOption>()
        for (page in TeamPaging.FIRST_PAGE..TeamPaging.MAX_PAGES) {
            when (val result = safeApiCall { api.services(page, TeamPaging.PAGE_SIZE) }) {
                is AppResult.Success -> {
                    val rows = result.data.data
                    all += rows.filter { it.active }.map { it.toOption() }
                    if (rows.size < TeamPaging.PAGE_SIZE) break
                }
                is AppResult.Error -> return result
                AppResult.Loading -> return AppResult.Loading
            }
        }
        return AppResult.Success(all)
    }

    override suspend fun create(request: NewBookingRequest): AppResult<CreatedBooking> =
        safeApiCall { api.create(request.toBody()) }.mapSuccess { it.data.toDomain() }
}
