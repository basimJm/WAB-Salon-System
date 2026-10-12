package com.fab.wab.customer.core.data.repository

import com.fab.wab.customer.core.data.dto.toDomain
import com.fab.wab.customer.core.data.remote.AppSettingsApiService
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.ApplicationSettings
import com.fab.wab.customer.core.domain.repository.ApplicationSettingsRepository
import com.fab.wab.customer.core.network.safeApiCall
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class ApplicationSettingsRepositoryImpl(private val appSettingsApiService: AppSettingsApiService) :
    ApplicationSettingsRepository {
    override suspend fun applicationSettings(): Flow<AppResult<ApplicationSettings>> {
        return flow {
            emit(AppResult.Loading)
            val response = safeApiCall { appSettingsApiService.getSettings() }

            when (response) {
                is AppResult.Error -> emit(AppResult.Error(response.appError))
                AppResult.Loading -> emit(AppResult.Loading)
                is AppResult.Success -> emit(AppResult.Success(response.data.data.toDomain()))
            }
        }
    }
}
