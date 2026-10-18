package com.fab.wab.customer.core.data.favorites

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.network.safeApiCall

class FavoritesRepositoryImpl(private val api: FavoritesApi) : FavoritesRepository {
    override suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean> =
        if (favorite) {
            safeApiCall { api.add(salonId) }.mapSuccess { it.data.isFavorite }
        } else {
            safeApiCall { api.remove(salonId) }.mapSuccess { it.data.isFavorite }
        }
}
