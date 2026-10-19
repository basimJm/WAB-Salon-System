package com.fab.wab.customer.feature.home.data.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.network.safeApiCall
import com.fab.wab.customer.feature.home.data.remote.HomeApi
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.repository.HomeRepository

class HomeRepositoryImpl(private val api: HomeApi) : HomeRepository {
    override suspend fun load(gender: Gender, location: LocationData?): AppResult<HomeContent> =
        safeApiCall { api.home(gender.code, location?.latitude, location?.longitude) }.mapSuccess { it.data.toDomain() }
}
