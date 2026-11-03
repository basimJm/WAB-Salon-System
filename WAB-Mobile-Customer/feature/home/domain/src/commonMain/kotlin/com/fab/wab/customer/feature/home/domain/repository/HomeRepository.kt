package com.fab.wab.customer.feature.home.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.home.domain.model.HomeContent

/**
 * `GET /home?gender=&businessType=&lat=&lng=`: the gender only picks the banners (§5.22); [lens] null = every business
 * type; coordinates only when the user allowed location (PRD S03 item 7).
 */
interface HomeRepository {
    suspend fun load(gender: Gender, lens: BusinessType?, location: LocationData?): AppResult<HomeContent>
}
