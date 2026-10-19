package com.fab.wab.customer.feature.salon.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository

class GetSalonDetailsUseCase(private val repository: SalonDetailsRepository) {
    suspend operator fun invoke(salonId: String): AppResult<SalonDetails> = repository.details(salonId)
}
