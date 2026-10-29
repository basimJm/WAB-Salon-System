package com.fab.wab.customer.feature.salons.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S04. */
object SalonsAnalytics {
    private const val SCREEN_NAME = "all_salons"
    private const val FILTER_SCREEN_NAME = "salon_filters"
    private const val SERVICES_SCREEN_NAME = "all_services"
    const val ACTION_SERVICE_CLICK = "service_click"
    const val ACTION_FILTER_APPLY = "filter_apply"
    const val ACTION_SEARCH = "salon_search"
    const val ACTION_FILTER_REMOVE = "filter_remove"
    const val ACTION_FILTER_OPEN = "filter_open"
    const val ACTION_SALON_CLICK = "salon_click"
    const val ACTION_BUSINESS_TYPE = "business_type_select"
    const val PARAM_ID = "id"
    const val PARAM_FILTER = "filter"
    const val PARAM_HAS_TEXT = "has_text"
    const val PARAM_VALUE = "value"
    const val VALUE_ALL = "all"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
    val FILTER_SCREEN = AnalyticsScreen(FILTER_SCREEN_NAME)
    val SERVICES_SCREEN = AnalyticsScreen(SERVICES_SCREEN_NAME)
}
