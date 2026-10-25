package com.fab.wab.merchant.feature.bookings.data.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.bookings.data.remote.CalendarApi
import com.fab.wab.merchant.feature.bookings.domain.model.CalendarEntry
import com.fab.wab.merchant.feature.bookings.domain.model.SalonHours
import com.fab.wab.merchant.feature.bookings.domain.repository.CalendarRepository
import kotlinx.datetime.LocalDate

class CalendarRepositoryImpl(private val api: CalendarApi) : CalendarRepository {
    override suspend fun entries(from: LocalDate, to: LocalDate, staffIds: Set<String>): AppResult<List<CalendarEntry>> =
        safeApiCall { api.entries(from, to, staffIds) }.mapSuccess { response -> response.data.mapNotNull { it.toDomain() } }

    override suspend fun hours(): AppResult<SalonHours> = safeApiCall { api.hours() }.mapSuccess { it.data.toDomain() }
}
