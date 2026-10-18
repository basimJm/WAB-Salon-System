package com.fab.wab.customer.feature.onboarding.presentation.analytics

import com.fab.wab.customer.core.analytics.AnalyticsScreen

/** PRD §14 names: `onboarding_skip`, `onboarding_complete`; the page index rides along as a parameter. */
object OnboardingAnalytics {
    private const val SCREEN_NAME = "onboarding"
    const val ACTION_SKIP = "onboarding_skip"
    const val ACTION_COMPLETE = "onboarding_complete"
    const val ACTION_NEXT = "onboarding_next"
    const val PARAM_PAGE = "page"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}

/** S02 names (PRD §14 `nickname_saved`); the gender travels as the scope, never the nickname. */
object GuestProfileAnalytics {
    private const val SCREEN_NAME = "nickname_gender"
    const val ACTION_SAVED = "nickname_saved"
    const val PARAM_GENDER = "gender"

    val SCREEN = AnalyticsScreen(SCREEN_NAME)
}
