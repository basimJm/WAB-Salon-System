package com.fab.wab.customer.feature.salon.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S07. */
object SalonAnalytics {
    private const val SCREEN_NAME = "salon_details"
    private const val STAFF_SCREEN_NAME = "staff_sheet"
    private const val SERVICE_SCREEN_NAME = "service_sheet"
    private const val REVIEWS_SCREEN_NAME = "reviews"
    const val ACTION_REVIEW_SUBMIT = "review_submit"
    const val ACTION_SHARE = "salon_share"
    const val ACTION_FAVORITE = "favorite_toggle"
    const val ACTION_CALL = "salon_call"
    const val ACTION_WHATSAPP = "salon_whatsapp"
    const val ACTION_MAPS = "salon_maps"
    const val ACTION_BOOK = "book_start"
    const val PARAM_SALON = "salon_id"
    const val PARAM_VALUE = "value"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
    val STAFF_SCREEN = AnalyticsScreen(STAFF_SCREEN_NAME)
    val SERVICE_SCREEN = AnalyticsScreen(SERVICE_SCREEN_NAME)
    val REVIEWS_SCREEN = AnalyticsScreen(REVIEWS_SCREEN_NAME)
}
