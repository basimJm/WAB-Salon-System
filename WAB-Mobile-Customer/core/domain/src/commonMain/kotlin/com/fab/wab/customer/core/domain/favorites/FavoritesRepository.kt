package com.fab.wab.customer.core.domain.favorites

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.SalonSummary

object FavoritesDefaults {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 10
}

/** Favorite toggle of the shared salon card (PRD 8.0, auth-gated by the caller) and the S20 list. */
interface FavoritesRepository {
    suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean>

    suspend fun list(page: Int = FavoritesDefaults.FIRST_PAGE, pageSize: Int = FavoritesDefaults.PAGE_SIZE): AppResult<List<SalonSummary>>
}
