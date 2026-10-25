package com.fab.wab.merchant.core.domain.repository

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.model.CachedItem
import kotlinx.coroutines.flow.Flow

interface LocalCacheRepository {
    fun observeItems(): Flow<AppResult<List<CachedItem>>>
    suspend fun upsertItem(item: CachedItem): Flow<AppResult<Unit>>
    suspend fun removeItem(itemId: Int): Flow<AppResult<Unit>>
    suspend fun clear(): Flow<AppResult<Unit>>
}
