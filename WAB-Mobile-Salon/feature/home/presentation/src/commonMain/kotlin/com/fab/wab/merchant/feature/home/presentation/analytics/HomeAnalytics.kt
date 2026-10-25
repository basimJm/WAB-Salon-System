package com.fab.wab.merchant.feature.home.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of M07 (Home). */
object HomeAnalytics {
    val SCREEN = AnalyticsScreen("home")
    const val ACTION_REFRESH = "home_refresh"
    const val ACTION_OPEN = "home_open"
    const val PARAM_TARGET = "target"
    const val TARGET_NOTIFICATIONS = "notifications"
    const val TARGET_BOOKING = "booking"
    const val TARGET_REQUESTS = "requests"
    const val TARGET_SUBSCRIPTION = "subscription"
    const val TARGET_SETUP = "setup"
    const val TARGET_CALENDAR = "calendar"
    const val TARGET_STATISTICS = "statistics"
}
