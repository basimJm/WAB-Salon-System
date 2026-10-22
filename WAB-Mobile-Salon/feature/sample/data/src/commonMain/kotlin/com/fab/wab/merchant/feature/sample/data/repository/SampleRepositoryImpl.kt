package com.fab.wab.merchant.feature.sample.data.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.sample.data.remote.dto.toDomain
import com.fab.wab.merchant.feature.sample.data.remote.service.SampleApiService
import com.fab.wab.merchant.feature.sample.domain.model.SampleItem
import com.fab.wab.merchant.feature.sample.domain.repository.SampleRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class SampleRepositoryImpl(
    private val apiService: SampleApiService,
) : SampleRepository {

    override fun getItems(): Flow<AppResult<List<SampleItem>>> = flow {
        emit(AppResult.Loading)
        when (val response = safeApiCall { apiService.getItems() }) {
            is AppResult.Loading -> emit(AppResult.Loading)
            is AppResult.Error -> emit(AppResult.Error(response.appError))
            is AppResult.Success -> emit(
                AppResult.Success(response.data.data.map { it.toDomain() })
            )
        }
    }
}
