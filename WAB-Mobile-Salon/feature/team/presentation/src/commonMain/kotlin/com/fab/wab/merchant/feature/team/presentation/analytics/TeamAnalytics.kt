package com.fab.wab.merchant.feature.team.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of the team screens (M17, M18). */
object TeamAnalytics {
    val SCREEN_TEAM = AnalyticsScreen("team")
    val SCREEN_MEMBER = AnalyticsScreen("team_member_edit")
    const val ACTION_MEMBER_SAVE = "team_member_save"
    const val ACTION_MEMBER_ACTIVE = "team_member_active"
    const val ACTION_CANCEL_AFFECTED = "cancel_affected_bookings"
    const val PARAM_NEW = "new"
    const val PARAM_STATE = "state"
    const val PARAM_COUNT = "count"
}
