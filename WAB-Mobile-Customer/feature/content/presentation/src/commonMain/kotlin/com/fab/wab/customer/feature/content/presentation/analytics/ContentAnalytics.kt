package com.fab.wab.customer.feature.content.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S23. */
object ContentAnalytics {
    private const val PAGE_SCREEN_NAME = "content_page"
    private const val FAQ_SCREEN_NAME = "faq"
    const val ACTION_FAQ_TOGGLE = "faq_toggle"
    const val ACTION_CONTACT = "contact_channel"
    const val ACTION_LINK = "content_link"
    const val PARAM_ID = "id"
    const val PARAM_SLUG = "slug"
    const val PARAM_VALUE = "value"

    val PAGE_SCREEN = AnalyticsScreen(PAGE_SCREEN_NAME)
    val FAQ_SCREEN = AnalyticsScreen(FAQ_SCREEN_NAME)
}
