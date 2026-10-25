package com.fab.wab.merchant.core.data.locations

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.network.safeApiCall
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * In-memory cache keyed by the language the names were fetched in, so switching language refetches instead of
 * showing the other language's names. One entry per (language, parent id); errors are never cached.
 */
class LocationsRepositoryImpl(
    private val api: LocationsApi,
    private val language: Flow<String>,
) : LocationsRepository {

    private val lock = Mutex()
    private val countriesCache = HashMap<String, List<Country>>()
    private val citiesCache = HashMap<CacheKey, List<City>>()
    private val areasCache = HashMap<CacheKey, List<Area>>()

    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> =
        cached(countriesCache, language.first(), refresh) {
            safeApiCall { api.countries() }.mapSuccess { response -> response.data.map { it.toDomain() } }
        }

    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> =
        cached(citiesCache, CacheKey(language.first(), countryCode), refresh) {
            safeApiCall { api.cities(countryCode) }.mapSuccess { response -> response.data.map { it.toDomain() } }
        }

    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> =
        cached(areasCache, CacheKey(language.first(), cityId), refresh) {
            safeApiCall { api.areas(cityId) }.mapSuccess { response -> response.data.map { it.toDomain() } }
        }

    private suspend fun <K, T> cached(
        cache: MutableMap<K, List<T>>,
        key: K,
        refresh: Boolean,
        load: suspend () -> AppResult<List<T>>,
    ): AppResult<List<T>> = lock.withLock {
        if (!refresh) cache[key]?.let { return@withLock AppResult.Success(it) }
        val result = load()
        if (result is AppResult.Success) cache[key] = result.data
        result
    }

    private data class CacheKey(val language: String, val parentId: String)
}
