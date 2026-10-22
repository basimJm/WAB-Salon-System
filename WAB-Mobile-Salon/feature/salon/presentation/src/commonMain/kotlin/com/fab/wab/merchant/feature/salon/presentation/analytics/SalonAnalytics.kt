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
    val SCREEN_HOURS = AnalyticsScreen("salon_working_hours")
    const val ACTION_HOURS_SAVE = "working_hours_save"
    const val ACTION_CLOSURE_SAVE = "closure_save"
    const val ACTION_CANCEL_AFFECTED = "cancel_affected_bookings"
    val SCREEN_SERVICES = AnalyticsScreen("salon_services")
    val SCREEN_CATALOG = AnalyticsScreen("salon_catalog_picker")
    val SCREEN_SERVICE_EDIT = AnalyticsScreen("salon_service_edit")
    const val ACTION_SERVICE_TOGGLE = "service_toggle_active"
    const val ACTION_SERVICE_SAVE = "service_save"
    const val PARAM_STATE = "state"
    const val PARAM_NEW = "new"
    const val PARAM_COUNT = "count"
}
