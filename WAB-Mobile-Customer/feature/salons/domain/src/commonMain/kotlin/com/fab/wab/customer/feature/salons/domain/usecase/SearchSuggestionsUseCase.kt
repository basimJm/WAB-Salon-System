package com.fab.wab.customer.feature.salons.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonQueryDefaults
import com.fab.wab.customer.feature.salons.domain.model.SearchSuggestions
import com.fab.wab.customer.feature.salons.domain.repository.SalonSuggestionsRepository

/** Blank text asks nothing (the contract needs `q`); the text is trimmed and cut to the contract's maximum. */
class SearchSuggestionsUseCase(private val repository: SalonSuggestionsRepository) {
    suspend operator fun invoke(text: String, filters: SalonFilters): AppResult<SearchSuggestions> {
        val q = text.trim().take(SalonQueryDefaults.MAX_TEXT_LENGTH)
        return if (q.isEmpty()) AppResult.Success(SearchSuggestions.NONE) else repository.suggestions(q, filters)
    }
}
