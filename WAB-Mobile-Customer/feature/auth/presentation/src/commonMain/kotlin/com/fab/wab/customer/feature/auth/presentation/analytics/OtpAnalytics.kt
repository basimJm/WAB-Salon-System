package com.fab.wab.customer.feature.auth.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S13; the phone never travels, only the purpose. */
object OtpAnalytics {
    private const val SCREEN_NAME = "otp"
    const val ACTION_REQUEST = "otp_request"
    const val ACTION_RESEND = "otp_resend"
    const val ACTION_REQUEST_FAIL = "otp_request_fail"
    const val ACTION_VERIFY_SUCCESS = "otp_verify_success"
    const val ACTION_VERIFY_FAIL = "otp_verify_fail"
    const val PARAM_PURPOSE = "purpose"
    const val PARAM_REASON = "reason"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
