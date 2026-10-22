package com.fab.wab.merchant.feature.bookings.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of the bookings screens (M08, M09). */
object BookingsAnalytics {
    val SCREEN_LIST = AnalyticsScreen("bookings")
    val SCREEN_DETAILS = AnalyticsScreen("booking_details")
    const val ACTION_ACCEPT = "request_accept"
    const val ACTION_REJECT = "request_reject"
    const val ACTION_CANCEL = "booking_cancel_by_salon"
    const val ACTION_COMPLETE = "booking_complete"
    const val ACTION_NO_SHOW = "booking_no_show"
    const val ACTION_REASSIGN = "booking_reassign"
    const val ACTION_FILTER = "bookings_filter_apply"
    const val PARAM_REASON = "reason"
    const val PARAM_TAB = "tab"
    const val PARAM_COUNT = "count"
}
