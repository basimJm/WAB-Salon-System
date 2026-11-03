package com.fab.wab.customer.feature.salons.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.salon.SalonFilters

/**
 * `GET /salons/filters`: price bounds (min–max of the businesses' service prices) for the chosen types, gender and
 * services; works without services (BUSINESS_DOMAIN §5.22). Null when the server has none.
 */
interface SalonFilterOptionsRepository {
    suspend fun priceBounds(filters: SalonFilters): AppResult<PriceRange?>
}
