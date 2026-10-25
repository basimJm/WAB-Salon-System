package com.fab.wab.merchant.core.data.repository

import com.fab.wab.merchant.core.data.mapper.toDomain
import com.fab.wab.merchant.core.data.mapper.toEntity
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.model.CachedItem
import com.fab.wab.merchant.core.domain.repository.LocalCacheRepository
import com.fab.wab.merchant.core.storage.db.dao.CachedItemDao
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart

class LocalCacheRepositoryImpl(private val dao: CachedItemDao) : LocalCacheRepository {

    override fun observeItems(): Flow<AppResult<List<CachedItem>>> {
        return dao.observeAll()
            .map { entities -> entities.map { it.toDomain() } }
            .map<List<CachedItem>, AppResult<List<CachedItem>>> { AppResult.Success(it) }
            .catch { emit(AppResult.Error(AppError.ParseError(it.message))) }
            .onStart { emit(AppResult.Loading) }
    }

    override suspend fun upsertItem(item: CachedItem): Flow<AppResult<Unit>> = write { dao.upsert(item.toEntity()) }

    override suspend fun removeItem(itemId: Int): Flow<AppResult<Unit>> = write { dao.deleteById(itemId) }

    override suspend fun clear(): Flow<AppResult<Unit>> = write { dao.deleteAll() }

    /** Loading, then success or the failure as an error result (the flow `catch` keeps cancellation intact). */
    private fun write(block: suspend () -> Unit): Flow<AppResult<Unit>> = flow<AppResult<Unit>> {
        emit(AppResult.Loading)
        block()
        emit(AppResult.Success(Unit))
    }.catch { emit(AppResult.Error(AppError.ParseError(it.message))) }
}
