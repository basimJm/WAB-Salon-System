package com.fab.wab.customer.feature.salon.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S07. */
object SalonAnalytics {
    private const val SCREEN_NAME = "salon_details"
    const val ACTION_SHARE = "salon_share"
    const val ACTION_FAVORITE = "favorite_toggle"
    const val ACTION_CALL = "salon_call"
    const val ACTION_WHATSAPP = "salon_whatsapp"
    const val ACTION_MAPS = "salon_maps"
    const val ACTION_BOOK = "book_start"
    const val PARAM_SALON = "salon_id"
    const val PARAM_VALUE = "value"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
