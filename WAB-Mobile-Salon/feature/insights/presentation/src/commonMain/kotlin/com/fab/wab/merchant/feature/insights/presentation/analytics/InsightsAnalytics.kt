package com.fab.wab.merchant.feature.insights.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of M20 (reviews) and M21 (statistics). */
object InsightsAnalytics {
    val SCREEN_REVIEWS = AnalyticsScreen("reviews")
    const val ACTION_REVIEWS_TAB = "reviews_tab"
    const val ACTION_REVIEW_REPORT = "review_report"
    const val PARAM_TAB = "tab"
    const val PARAM_CHANNEL = "channel"
    const val CHANNEL_CALL = "call"
    const val CHANNEL_WHATSAPP = "whatsapp"
    const val CHANNEL_EMAIL = "email"
}
