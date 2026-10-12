package com.fab.wab.customer.core.domain.repository

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.ApplicationSettings
import kotlinx.coroutines.flow.Flow

interface ApplicationSettingsRepository {
    suspend fun applicationSettings(): Flow<AppResult<ApplicationSettings>>
}