package com.fab.wab.customer.feature.salons.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.salon.SalonQueryDefaults
import com.fab.wab.customer.core.domain.search.RecentSearchesStore
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSalonsUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSuggestionsUseCase

class AllSalonsDependencies(
    val searchSalons: SearchSalonsUseCase,
    val suggestions: SearchSuggestionsUseCase,
    val recentSearches: RecentSearchesStore,
    val currentLocation: GetCurrentLocationUseCase,
    val sessionStore: SessionStore,
    val permissions: PermissionFlow,
    val favorites: FavoritesRepository,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val debounceMs: Long = SalonQueryDefaults.SEARCH_DEBOUNCE_MS,
)
