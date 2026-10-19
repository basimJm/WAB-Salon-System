package com.fab.wab.customer.feature.booking.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S16. */
object BookingAnalytics {
    private const val SCREEN_NAME = "booking_flow"
    const val ACTION_STEP = "booking_step"
    const val ACTION_SERVICE_TOGGLE = "booking_service_toggle"
    const val PARAM_STEP = "step"
    const val PARAM_ID = "id"
    const val PARAM_VALUE = "value"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
