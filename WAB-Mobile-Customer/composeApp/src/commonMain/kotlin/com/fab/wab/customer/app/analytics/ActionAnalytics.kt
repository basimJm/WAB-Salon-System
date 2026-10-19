package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.mvi.UiActionObserver

/** Installs the PRD §14 action tap: every `UiAction` classified as [ActionEvent.Named] is logged with its owner. */
object ActionAnalytics {
    const val PARAM_OWNER = "owner"

    fun install(tracker: AnalyticsTracker) {
        UiActionObserver.install { owner, action -> eventFor(owner, action)?.let(tracker::trackAction) }
    }

    fun eventFor(owner: String, action: Any?): AnalyticsAction? {
        val named = AnalyticsCatalog.actionEventOf(action) as? ActionEvent.Named ?: return null
        return AnalyticsAction(named.name, analyticsParams { text(PARAM_OWNER, owner) })
    }
}
