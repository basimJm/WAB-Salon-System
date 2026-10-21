package com.fab.wab.customer.feature.booking.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S16. */
object BookingAnalytics {
    private const val SCREEN_NAME = "booking_flow"
    const val ACTION_STEP = "booking_step"
    const val ACTION_SERVICE_TOGGLE = "booking_service_toggle"
    const val ACTION_PAYMENT_METHOD = "booking_payment_method"
    const val PARAM_STEP = "step"
    const val PARAM_ID = "id"
    const val PARAM_VALUE = "value"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}

/** PRD §14 names for S17. */
object BookingSuccessAnalytics {
    private const val SCREEN_NAME = "booking_success"
    const val ACTION_COPY_REFERENCE = "booking_success_copy_reference"
    const val ACTION_VIEW_BOOKING = "booking_success_view_booking"
    const val ACTION_BACK_HOME = "booking_success_back_home"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}

/** PRD §14 names for S16 step 6 (verification). */
object BookingVerifyAnalytics {
    private const val SCREEN_NAME = "booking_verify"
    const val ACTION_VERIFY = "booking_verify_open_otp"
    const val ACTION_RETRY = "booking_verify_retry"
    const val ACTION_CREATED = "booking_verify_created"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
