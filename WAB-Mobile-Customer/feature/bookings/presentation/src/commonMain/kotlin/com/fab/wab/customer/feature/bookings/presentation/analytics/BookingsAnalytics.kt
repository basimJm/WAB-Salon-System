package com.fab.wab.customer.feature.bookings.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S14. */
object BookingsAnalytics {
    private const val SCREEN_NAME = "bookings"
    private const val DETAILS_SCREEN_NAME = "booking_details"
    private const val RATING_SCREEN_NAME = "booking_rating"
    const val ACTION_RATE_SUBMIT = "booking_rate_submit"
    const val ACTION_RATE_SKIP = "booking_rate_skip"
    const val ACTION_CANCEL = "booking_cancel"
    const val ACTION_TAB = "bookings_tab"
    const val ACTION_SEARCH = "bookings_search"
    const val ACTION_OPEN = "booking_open"
    const val PARAM_TAB = "tab"
    const val PARAM_ID = "id"
    const val PARAM_HAS_TEXT = "has_text"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
    val DETAILS_SCREEN = AnalyticsScreen(DETAILS_SCREEN_NAME)
    val RATING_SCREEN = AnalyticsScreen(RATING_SCREEN_NAME)
}
