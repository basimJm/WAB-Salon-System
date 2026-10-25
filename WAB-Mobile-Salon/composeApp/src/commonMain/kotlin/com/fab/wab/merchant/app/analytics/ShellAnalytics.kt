package com.fab.wab.merchant.app.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.notification.push.PushNotification

/** PRD §14 events the shell owns (they belong to no single screen). */
object ShellAnalytics {
    const val ACTION_PUSH_OPEN = "push_open"
    const val PARAM_EVENT = "event"
    const val PARAM_HAS_LINK = "has_link"

    /** A tapped system notification: which server event it carried and whether it opens a screen. */
    fun pushOpen(push: PushNotification) = AnalyticsAction(
        ACTION_PUSH_OPEN,
        analyticsParams {
            push.data[PushKeys.EVENT]?.takeIf { it.isNotBlank() }?.let { text(PARAM_EVENT, it) }
            flag(PARAM_HAS_LINK, push.deepLink != null)
        },
    )
}
