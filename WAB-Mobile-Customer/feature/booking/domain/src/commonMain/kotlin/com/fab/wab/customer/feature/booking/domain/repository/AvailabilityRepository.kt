package com.fab.wab.customer.feature.booking.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.booking.domain.model.DayAvailability
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson

/**
 * `POST /salons/{salonId}/availability`: slots for one person at [branchId] (BUSINESS_DOMAIN §5.18; required when the
 * salon has several bookable branches, null for single-branch salons); earlier persons' picks go in `others`.
 */
interface AvailabilityRepository {
    suspend fun slots(
        salonId: String,
        branchId: String?,
        date: String,
        person: DraftPerson,
        others: List<DraftPerson>,
        draftId: String?,
    ): AppResult<DayAvailability>
}
