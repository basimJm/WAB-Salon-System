package com.fab.wab.merchant.feature.salon.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of the salon management screens (M12–M19). */
object SalonAnalytics {
    val SCREEN_HUB = AnalyticsScreen("salon_hub")
    const val ACTION_HUB_OPEN = "salon_hub_open"
    const val PARAM_TILE = "tile"
}
