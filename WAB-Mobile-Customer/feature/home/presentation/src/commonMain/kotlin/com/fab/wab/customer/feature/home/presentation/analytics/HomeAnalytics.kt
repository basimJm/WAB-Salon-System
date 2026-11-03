package com.fab.wab.customer.feature.home.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S03. */
object HomeAnalytics {
    private const val SCREEN_NAME = "home"
    const val ACTION_LENS = "home_type_lens"
    const val ACTION_BOOK_AGAIN = "home_book_again_click"
    const val ACTION_BANNER_CLICK = "banner_click"
    const val ACTION_SERVICE_CLICK = "home_service_click"
    const val ACTION_SALON_CLICK = "home_salon_click"
    const val ACTION_SEARCH_CLICK = "home_search_click"
    const val ACTION_ENABLE_LOCATION = "enable_location_click"
    const val ACTION_RETRY_LOCATION = "retry_location_click"
    const val ACTION_FAVORITE = "favorite_toggle"
    const val PARAM_TYPE = "type"
    const val VALUE_ALL = "all"
    const val PARAM_ID = "id"
    const val PARAM_SECTION = "section"
    const val PARAM_VALUE = "value"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
