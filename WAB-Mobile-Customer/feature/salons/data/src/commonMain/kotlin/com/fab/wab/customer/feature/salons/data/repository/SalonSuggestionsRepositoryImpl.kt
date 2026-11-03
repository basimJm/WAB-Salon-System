package com.fab.wab.customer.feature.salons.data.repository

import com.fab.wab.customer.core.data.contract.generated.GetSalonsSuggestionsData
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.salons.data.remote.SalonSearchApi
import com.fab.wab.customer.feature.salons.domain.model.SearchSuggestions
import com.fab.wab.customer.feature.salons.domain.model.SuggestedPlace
import com.fab.wab.customer.feature.salons.domain.model.SuggestedService
import com.fab.wab.customer.feature.salons.domain.repository.SalonSuggestionsRepository

class SalonSuggestionsRepositoryImpl(private val api: SalonSearchApi) : SalonSuggestionsRepository {
    override suspend fun suggestions(text: String, filters: SalonFilters): AppResult<SearchSuggestions> =
        safeApiCall { api.suggestions(text, filters) }.mapSuccess { it.data.toDomain() }
}

/** Services keep the server order; a duplicated id (same service listed twice) is shown once. */
fun GetSalonsSuggestionsData.toDomain(): SearchSuggestions = SearchSuggestions(
    services = services.distinctBy { it.id }.map {
        SuggestedService(it.id, it.name, BusinessType.fromCode(it.businessType), it.placesCount.toInt().coerceAtLeast(0))
    },
    places = places.distinctBy { it.id }.map {
        SuggestedPlace(it.id, it.name, BusinessType.fromCode(it.businessType), Audience.fromCode(it.audience))
    },
)
