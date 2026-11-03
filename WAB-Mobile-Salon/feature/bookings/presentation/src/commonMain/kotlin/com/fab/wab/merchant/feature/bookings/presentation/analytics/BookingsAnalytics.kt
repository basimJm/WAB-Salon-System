package com.fab.wab.merchant.feature.bookings.presentation.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsScreen

/** PRD §14 events of the bookings screens (M08–M11). */
object BookingsAnalytics {
    val SCREEN_LIST = AnalyticsScreen("bookings")
    val SCREEN_DETAILS = AnalyticsScreen("booking_details")
    val SCREEN_REQUEST = AnalyticsScreen("booking_request_sheet")
    val SCREEN_REQUEST_OVERLAY = AnalyticsScreen("booking_request_overlay")
    val SCREEN_CALENDAR = AnalyticsScreen("calendar")
    val SCREEN_NEW_BOOKING = AnalyticsScreen("new_booking")
    const val ACTION_SHOWN = "request_shown"
    const val ACTION_ACCEPT = "request_accept"
    const val ACTION_REJECT = "request_reject"
    const val ACTION_CANCEL = "booking_cancel_by_salon"
    const val ACTION_COMPLETE = "booking_complete"
    const val ACTION_NO_SHOW = "booking_no_show"
    const val ACTION_REASSIGN = "booking_reassign"
    const val ACTION_FILTER = "bookings_filter_apply"
    const val ACTION_CREATE = "booking_create_by_business"
    const val ACTION_CALENDAR_MODE = "calendar_mode_change"
    const val ACTION_CALENDAR_FILTER = "calendar_staff_filter"
    const val PARAM_REASON = "reason"
    const val PARAM_CHANNEL = "channel"
    const val PARAM_RESPONSE_SECONDS = "response_time_s"
    const val PARAM_BRIDE = "bride"

    /** Request channels of PRD §14 (`overlay` / `notification` are the outside-the-app paths, MER-029/030). */
    const val CHANNEL_IN_APP = "in_app"
    const val CHANNEL_OVERLAY = "overlay"
    const val CHANNEL_NOTIFICATION = "notification"
    const val PARAM_TAB = "tab"
    const val PARAM_COUNT = "count"
    const val PARAM_MODE = "mode"
    const val PARAM_SOURCE = "source"
    const val SOURCE_SHEET = "sheet"
}
