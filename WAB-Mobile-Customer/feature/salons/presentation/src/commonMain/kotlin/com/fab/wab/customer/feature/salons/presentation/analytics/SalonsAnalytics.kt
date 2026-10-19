package com.fab.wab.customer.feature.salons.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S04. */
object SalonsAnalytics {
    private const val SCREEN_NAME = "all_salons"
    private const val FILTER_SCREEN_NAME = "salon_filters"
    const val ACTION_FILTER_APPLY = "filter_apply"
    const val ACTION_SEARCH = "salon_search"
    const val ACTION_FILTER_REMOVE = "filter_remove"
    const val ACTION_FILTER_OPEN = "filter_open"
    const val ACTION_SALON_CLICK = "salon_click"
    const val PARAM_ID = "id"
    const val PARAM_FILTER = "filter"
    const val PARAM_HAS_TEXT = "has_text"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
    val FILTER_SCREEN = AnalyticsScreen(FILTER_SCREEN_NAME)
}
