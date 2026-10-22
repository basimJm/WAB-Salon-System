package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsKeys
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.analytics.AnalyticsUserType
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.firebase.CrashReporter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

/**
 * Keeps the vendor user id and user properties in step with the session: set on login / registration,
 * cleared on logout, on analytics and crash reports alike. Only the id leaves the device, never the name.
 */
class SessionAnalyticsSync(
    private val session: Flow<SessionState>,
    private val tracker: AnalyticsTracker,
    private val crashReporter: CrashReporter,
) {
    fun start(scope: CoroutineScope): Job =
        session.distinctUntilChanged().onEach(::apply).launchIn(scope)

    private fun apply(state: SessionState) {
        val userId = (state as? SessionState.SignedIn)?.user?.id
        tracker.setUserId(userId)
        crashReporter.setUserId(userId)
        val userType = if (state.isSignedIn) AnalyticsUserType.REGISTERED else AnalyticsUserType.GUEST
        tracker.setUserProperty(AnalyticsKeys.USER_TYPE, userType.value)
    }
}
