package com.fab.wab.merchant.feature.application.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of the salon application flow (M04, M05). */
object ApplicationAnalytics {
    val SCREEN_REGISTRATION = AnalyticsScreen("registration")
    val SCREEN_STATUS = AnalyticsScreen("application_status")
    val SCREEN_CHECKLIST = AnalyticsScreen("setup_checklist")
    const val ACTION_SETUP_ITEM = "setup_item_open"
    const val PARAM_STEP = "step"
    const val ACTION_SUBMIT = "registration_submit"
    const val ACTION_RESUBMIT = "application_resubmit"
    const val ACTION_DOCUMENT_UPLOAD = "document_upload"
    const val PARAM_RESULT = "result"
    const val PARAM_COUNT = "count"
    const val RESULT_SUCCESS = "success"
    const val RESULT_ERROR = "error"
}
