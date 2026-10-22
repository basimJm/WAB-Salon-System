package com.fab.wab.merchant.feature.salon.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of the salon management screens (M12–M19). */
object SalonAnalytics {
    val SCREEN_HUB = AnalyticsScreen("salon_hub")
    val SCREEN_PROFILE = AnalyticsScreen("salon_profile_edit")
    val SCREEN_PROFILE_MAP = AnalyticsScreen("salon_profile_map")
    val SCREEN_PROFILE_PREVIEW = AnalyticsScreen("salon_profile_preview")
    const val ACTION_HUB_OPEN = "salon_hub_open"
    const val PARAM_TILE = "tile"
    const val ACTION_PROFILE_SAVE = "salon_profile_save"
    val SCREEN_GALLERY = AnalyticsScreen("salon_gallery")
    const val ACTION_GALLERY_ADD = "gallery_add"
    const val ACTION_GALLERY_REORDER = "gallery_reorder"
    const val ACTION_GALLERY_DELETE = "gallery_delete"
    const val PARAM_TYPE = "type"
    const val PARAM_COUNT = "count"
}
