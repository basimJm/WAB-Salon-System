package com.fab.wab.customer.feature.profile.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names for S21. */
object ProfileAnalytics {
    private const val SCREEN_NAME = "profile"
    private const val EDIT_SCREEN_NAME = "profile_edit"
    const val ACTION_EDIT_GUEST = "profile_edit_guest"
    const val ACTION_LANGUAGE = "profile_language"
    const val ACTION_THEME = "profile_theme"
    const val ACTION_PUSH = "profile_push_toggle"
    const val ACTION_PHOTO = "profile_photo"
    const val ACTION_CONTACT = "profile_contact"
    const val ACTION_OPEN = "profile_open"
    const val ACTION_LOGOUT = "profile_logout"
    const val ACTION_DELETE_ACCOUNT = "profile_delete_account"
    const val ACTION_EDIT_SAVE = "profile_edit_save"
    const val ACTION_EDIT_PHONE = "profile_edit_phone_otp"
    const val PARAM_VALUE = "value"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
    val EDIT_SCREEN = AnalyticsScreen(EDIT_SCREEN_NAME)
}
