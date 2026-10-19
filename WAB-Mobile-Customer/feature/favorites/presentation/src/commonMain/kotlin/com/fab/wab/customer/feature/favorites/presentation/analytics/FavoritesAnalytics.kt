package com.fab.wab.customer.feature.favorites.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S20. */
object FavoritesAnalytics {
    private const val SCREEN_NAME = "favorites"
    const val ACTION_REMOVE = "favorite_remove"
    const val ACTION_EXPLORE = "favorites_explore"
    const val PARAM_ID = "id"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
