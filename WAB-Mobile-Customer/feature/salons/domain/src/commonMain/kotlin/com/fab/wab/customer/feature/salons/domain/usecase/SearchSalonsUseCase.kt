package com.fab.wab.customer.feature.salons.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.SalonQuery
import com.fab.wab.customer.core.domain.salon.SalonQueryDefaults
import com.fab.wab.customer.core.domain.salon.SalonSearchRepository
import com.fab.wab.customer.core.domain.salon.SalonSummary

class SearchSalonsUseCase(private val repository: SalonSearchRepository) {
    suspend operator fun invoke(query: SalonQuery): AppResult<List<SalonSummary>> =
        repository.search(query.copy(text = query.text.trim().take(SalonQueryDefaults.MAX_TEXT_LENGTH)))
}
