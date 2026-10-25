package com.fab.wab.merchant.feature.branches.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** Events of the owner's branch management (MER-062). */
object BranchesAnalytics {
    val SCREEN_BRANCHES = AnalyticsScreen("branches")
    val SCREEN_BRANCH_EDIT = AnalyticsScreen("branch_edit")
    const val ACTION_BRANCH_SAVE = "branch_save"
    const val ACTION_BRANCH_MAIN = "branch_set_main"
    const val ACTION_BRANCH_OFFLINE = "branch_offline"
    const val ACTION_BRANCH_ONLINE = "branch_online"
    const val ACTION_BRANCH_CLOSE = "branch_close"
    const val PARAM_NEW = "new"
    const val PARAM_BLOCKED = "blocked_count"
}
