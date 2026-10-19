package com.fab.wab.customer.feature.favorites.di

import com.fab.wab.customer.feature.favorites.domain.usecase.LoadFavoritesUseCase
import com.fab.wab.customer.feature.favorites.domain.usecase.RemoveFavoriteUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val favoritesModule = module {
    singleOf(::LoadFavoritesUseCase)
    singleOf(::RemoveFavoriteUseCase)
}
