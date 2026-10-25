package com.fab.wab.customer.feature.booking.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.feature.booking.domain.model.DayAvailability
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.repository.AvailabilityRepository

class LoadAvailabilityUseCase(private val repository: AvailabilityRepository) {
    suspend operator fun invoke(
        salonId: String,
        branchId: String?,
        date: String,
        person: DraftPerson,
        others: List<DraftPerson>,
    ): AppResult<DayAvailability> = repository.slots(salonId, branchId, date, person, others.filter { it.hasSlot }, draftId = null)
}
