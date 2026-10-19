package com.fab.wab.customer.feature.salons.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.session.Gender

/** `GET /salons/filters`: price bounds of the selected services (PRD S05 item 2); null when the server has none. */
interface SalonFilterOptionsRepository {
    suspend fun priceBounds(gender: Gender, serviceIds: List<String>): AppResult<PriceRange?>
}
