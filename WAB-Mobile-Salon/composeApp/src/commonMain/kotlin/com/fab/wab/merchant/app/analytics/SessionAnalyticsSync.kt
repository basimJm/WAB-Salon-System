package com.fab.wab.merchant.app.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsKeys
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.AnalyticsUserType
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.firebase.CrashReporter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

/**
 * Keeps the vendor user id and user properties in step with the session: set on login / registration,
 * cleared on logout, on analytics and crash reports alike; salon id and role become user properties (PRD §14).
 * Only ids leave the device, never the name.
 */
class SessionAnalyticsSync(
    private val session: Flow<SessionState>,
    private val tracker: AnalyticsTracker,
    private val crashReporter: CrashReporter,
) {
    fun start(scope: CoroutineScope): Job =
        session.distinctUntilChanged().onEach(::apply).launchIn(scope)

    private fun apply(state: SessionState) {
        val member = (state as? SessionState.SignedIn)?.member
        tracker.setUserId(member?.id)
        crashReporter.setUserId(member?.id)
        val userType = if (state.isSignedIn) AnalyticsUserType.REGISTERED else AnalyticsUserType.GUEST
        tracker.setUserProperty(AnalyticsKeys.USER_TYPE, userType.value)
        tracker.setUserProperty(AnalyticsKeys.SALON_ID, member?.salonId)
        tracker.setUserProperty(AnalyticsKeys.ROLE, member?.role?.name)
    }
}
