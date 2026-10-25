package com.fab.wab.merchant.feature.more.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of M25. */
object MoreAnalytics {
    val SCREEN_MORE = AnalyticsScreen("more")
    const val ACTION_LANGUAGE = "settings_language"
    const val ACTION_THEME = "settings_theme"
    const val ACTION_PUSH = "settings_push"
    const val ACTION_OVERLAY = "settings_overlay_open"
    const val ACTION_OVERLAY_RESULT = "overlay_permission_result"
    const val PARAM_GRANTED = "granted"
    const val ACTION_SOUND = "settings_sound_test"
    const val ACTION_LOGOUT = "logout"
    const val PARAM_VALUE = "value"
}

/** Content page slugs (`GET /content/pages/{slug}`). */
object MoreSlugs {
    const val TERMS = "terms"
    const val PRIVACY = "privacy"
    const val ABOUT = "about"
}
