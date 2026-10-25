package com.fab.wab.merchant.core.data.config

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.config.AppConfig
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AppConfigRepositoryImpl(private val api: AppConfigApi) : AppConfigRepository {
    private val state = MutableStateFlow<AppConfig?>(null)

    override val current: StateFlow<AppConfig?> = state.asStateFlow()

    override suspend fun refresh(): AppResult<AppConfig> {
        val result = safeApiCall { api.getConfig() }.mapSuccess { it.data.toDomain() }
        if (result is AppResult.Success) state.value = result.data
        return result
    }
}
