package com.fab.wab.customer.feature.home.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.home.domain.model.HomeContent

/** `GET /home?gender=&lat=&lng=`: coordinates only when the user allowed location (PRD S03 item 7). */
interface HomeRepository {
    suspend fun load(gender: Gender, location: LocationData?): AppResult<HomeContent>
}
