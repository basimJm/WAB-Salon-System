package com.fab.wab.customer.feature.auth.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S11; the number itself never travels (only the country). */
object LoginAnalytics {
    private const val SCREEN_NAME = "login"
    const val ACTION_LOGIN_START = "login_start"
    const val ACTION_REGISTER_CLICK = "register_click"
    const val ACTION_LANGUAGE_CHANGE = "language_change"
    const val ACTION_THEME_CHANGE = "theme_change"
    const val PARAM_COUNTRY = "country"
    const val PARAM_RESULT = "result"
    const val PARAM_LANGUAGE = "language"
    const val PARAM_THEME = "theme"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
