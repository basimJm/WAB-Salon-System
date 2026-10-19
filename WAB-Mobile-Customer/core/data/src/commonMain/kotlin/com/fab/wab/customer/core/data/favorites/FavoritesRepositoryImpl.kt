package com.fab.wab.customer.core.data.favorites

import com.fab.wab.customer.core.data.contract.generated.GetFavoritesDataItem
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.network.safeApiCall

class FavoritesRepositoryImpl(private val api: FavoritesApi) : FavoritesRepository {
    override suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean> =
        if (favorite) {
            safeApiCall { api.add(salonId) }.mapSuccess { it.data.isFavorite }
        } else {
            safeApiCall { api.remove(salonId) }.mapSuccess { it.data.isFavorite }
        }

    override suspend fun list(page: Int, pageSize: Int): AppResult<List<SalonSummary>> =
        safeApiCall { api.list(page, pageSize) }.mapSuccess { response -> response.data.map { it.toDomain() } }
}

fun GetFavoritesDataItem.toDomain(): SalonSummary = SalonSummary(
    id = id,
    name = name,
    imageUrl = profileImageUrl,
    rating = rating.toFloat(),
    reviewsCount = reviewsCount.toInt(),
    locationText = locationText,
    shortDescription = shortDescription,
    isOpenNow = isOpenNow,
    todayHours = todayHours?.let { OpeningHours(it.open, it.close) },
    isFavorite = isFavorite,
    distanceKm = distanceKm,
)
