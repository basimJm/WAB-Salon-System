package com.fab.wab.customer.core.domain.favorites

import com.fab.wab.customer.core.domain.AppResult

/** Favorite toggle of the shared salon card (PRD 8.0, auth-gated by the caller); answers the server's final flag. */
interface FavoritesRepository {
    suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean>
}
