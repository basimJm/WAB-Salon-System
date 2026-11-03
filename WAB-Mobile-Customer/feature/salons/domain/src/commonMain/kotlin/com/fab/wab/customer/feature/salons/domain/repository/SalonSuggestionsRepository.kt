package com.fab.wab.customer.feature.salons.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.feature.salons.domain.model.SearchSuggestions

/** `GET /salons/suggestions?q=&businessType=&gender=`: typed suggestions within the active type and gender filters. */
interface SalonSuggestionsRepository {
    suspend fun suggestions(text: String, filters: SalonFilters): AppResult<SearchSuggestions>
}
