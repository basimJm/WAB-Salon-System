package com.fab.wab.customer.feature.salons.data.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.salons.data.remote.SalonFiltersApi
import com.fab.wab.customer.feature.salons.domain.repository.SalonFilterOptionsRepository

class SalonFilterOptionsRepositoryImpl(private val api: SalonFiltersApi) : SalonFilterOptionsRepository {
    override suspend fun priceBounds(gender: Gender, serviceIds: List<String>): AppResult<PriceRange?> =
        safeApiCall { api.filters(gender.code, serviceIds) }
            .mapSuccess { response -> response.data.priceRange?.let { PriceRange(it.min, it.max) } }
}
