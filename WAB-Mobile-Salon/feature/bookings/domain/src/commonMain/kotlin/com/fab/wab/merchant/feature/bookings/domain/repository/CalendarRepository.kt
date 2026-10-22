package com.fab.wab.merchant.feature.bookings.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.feature.bookings.domain.model.CalendarEntry
import com.fab.wab.merchant.feature.bookings.domain.model.SalonHours
import kotlinx.datetime.LocalDate

/** PRD M11 read-only calendar; the server scopes entries to the member (`BOOKINGS_VIEW_OWN` → own only). */
interface CalendarRepository {
    suspend fun entries(from: LocalDate, to: LocalDate, staffIds: Set<String>): AppResult<List<CalendarEntry>>

    suspend fun hours(): AppResult<SalonHours>
}
