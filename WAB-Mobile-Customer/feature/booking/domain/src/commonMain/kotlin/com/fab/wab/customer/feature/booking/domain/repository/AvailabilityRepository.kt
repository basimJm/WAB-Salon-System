package com.fab.wab.customer.feature.booking.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.booking.domain.model.DayAvailability
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson

/** `POST /salons/{salonId}/availability`: slots for one person; earlier persons' picks go in `others`. */
interface AvailabilityRepository {
    suspend fun slots(
        salonId: String,
        date: String,
        person: DraftPerson,
        others: List<DraftPerson>,
        draftId: String?,
    ): AppResult<DayAvailability>
}
