package com.fab.wab.customer.core.analytics

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** Receives events the tracker refused (invalid name or keys) so dev builds can surface programming errors. */
fun interface AnalyticsIssueReporter {
    fun report(event: AnalyticsEvent, issues: List<AnalyticsIssue>)
}

object NoOpAnalyticsIssueReporter : AnalyticsIssueReporter {
    override fun report(event: AnalyticsEvent, issues: List<AnalyticsIssue>) = Unit
}

/**
 * The one real [AnalyticsTracker]: turns screens and actions into events, merges the common context
 * (event parameters win over context parameters), validates, sanitizes and forwards to the backend on [scope].
 * Invalid events are reported, never sent, never thrown.
 */
class DefaultAnalyticsTracker(
    private val backend: AnalyticsBackend,
    private val contextProvider: AnalyticsContextProvider,
    private val scope: CoroutineScope,
    private val issueReporter: AnalyticsIssueReporter = NoOpAnalyticsIssueReporter,
) : AnalyticsTracker {

    override fun trackScreen(screen: AnalyticsScreen) {
        val params = analyticsParams { text(AnalyticsKeys.SCREEN_NAME, screen.name) } + screen.params
        send(AnalyticsEvent(AnalyticsEventNames.SCREEN_VIEW, params))
    }

    override fun trackAction(action: AnalyticsAction) {
        send(AnalyticsEvent(action.name, action.params))
    }

    override fun setUserId(userId: String?) {
        scope.launch { backend.setUserId(userId) }
    }

    override fun setUserProperty(key: String, value: String?) {
        scope.launch { backend.setUserProperty(key, value) }
    }

    private fun send(event: AnalyticsEvent) {
        scope.launch {
            val enriched = event.copy(params = contextProvider.current().toParams() + event.params)
            val issues = AnalyticsValidation.issues(enriched)
            if (issues.isEmpty()) {
                backend.logEvent(AnalyticsValidation.sanitized(enriched))
            } else {
                issueReporter.report(enriched, issues)
            }
        }
    }
}
