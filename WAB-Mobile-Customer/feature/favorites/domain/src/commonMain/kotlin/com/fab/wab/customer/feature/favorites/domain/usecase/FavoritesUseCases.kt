package com.fab.wab.customer.feature.favorites.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.salon.SalonSummary

class LoadFavoritesUseCase(private val repository: FavoritesRepository) {
    suspend operator fun invoke(page: Int): AppResult<List<SalonSummary>> = repository.list(page)
}

class RemoveFavoriteUseCase(private val repository: FavoritesRepository) {
    suspend operator fun invoke(salonId: String): AppResult<Boolean> = repository.setFavorite(salonId, favorite = false)
}
