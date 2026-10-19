package com.fab.wab.customer.feature.favorites.presentation.di

import com.fab.wab.customer.feature.favorites.presentation.controller.vm.FavoritesViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val favoritesPresentationModule = module {
    viewModel { FavoritesViewModel(loadFavorites = get(), removeFavorite = get(), sessionStore = get(), analytics = get()) }
}
