package com.fab.wab.customer.feature.auth.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S12; only the gender and city ride along, never names, email or phone. */
object RegisterAnalytics {
    private const val SCREEN_NAME = "register"
    const val ACTION_SUBMIT = "register_submit"
    const val ACTION_COMPLETE = "register_complete"
    const val ACTION_LOGIN_CLICK = "login_click"
    const val PARAM_GENDER = "gender"
    const val PARAM_CITY_ID = "city_id"
    const val PARAM_RESULT = "result"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
