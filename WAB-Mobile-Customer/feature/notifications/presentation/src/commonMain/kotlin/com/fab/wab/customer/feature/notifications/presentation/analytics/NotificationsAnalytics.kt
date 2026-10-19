package com.fab.wab.customer.feature.notifications.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S19. */
object NotificationsAnalytics {
    private const val SCREEN_NAME = "notifications"
    const val ACTION_OPEN = "notification_open"
    const val ACTION_VIEW_BOOKING = "notification_view_booking"
    const val ACTION_FILTER_APPLY = "notifications_filter_apply"
    const val ACTION_FILTER_RESET = "notifications_filter_reset"
    const val PARAM_ID = "id"
    const val PARAM_HAS_TEXT = "has_text"
    const val PARAM_HAS_DATES = "has_dates"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
