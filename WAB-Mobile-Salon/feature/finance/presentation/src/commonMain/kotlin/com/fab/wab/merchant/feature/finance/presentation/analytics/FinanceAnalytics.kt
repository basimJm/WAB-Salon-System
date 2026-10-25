package com.fab.wab.merchant.feature.finance.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of M22 (finance, bank details). */
object FinanceAnalytics {
    val SCREEN_FINANCE = AnalyticsScreen("finance")
    val SCREEN_BANK = AnalyticsScreen("finance_bank_details")
    const val ACTION_TAB = "finance_tab"
    const val ACTION_RANGE = "finance_range"
    const val ACTION_BANK_SAVE = "bank_details_save"
    const val PARAM_TAB = "tab"
    const val PARAM_RANGE = "range"
}
