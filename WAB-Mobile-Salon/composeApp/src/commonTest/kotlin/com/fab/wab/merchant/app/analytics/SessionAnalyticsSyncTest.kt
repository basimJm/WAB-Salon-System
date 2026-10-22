package com.fab.wab.merchant.app.analytics

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsKeys
import com.fab.wab.merchant.core.analytics.AnalyticsScreen
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.firebase.FakeCrashReporter
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

private class RecordingTracker : AnalyticsTracker {
    var lastUserId: String? = null
    val properties = LinkedHashMap<String, String?>()
    override fun trackScreen(screen: AnalyticsScreen) = Unit
    override fun trackAction(action: AnalyticsAction) = Unit
    override fun trackRoute(route: String?) = Unit
    override fun setUserId(userId: String?) {
        lastUserId = userId
    }

    override fun setUserProperty(key: String, value: String?) {
        properties[key] = value
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class SessionAnalyticsSyncTest {

    private val session = MutableStateFlow<SessionState>(SessionState.Guest)
    private val tracker = RecordingTracker()
    private val crashReporter = FakeCrashReporter()

    @Test
    fun userIdFollowsLoginAndLogoutOnAnalyticsAndCrashReports() = runTest(UnconfinedTestDispatcher()) {
        val job = SessionAnalyticsSync(session, tracker, crashReporter).start(backgroundScope)
        assertNull(tracker.lastUserId)
        assertEquals("guest", tracker.properties[AnalyticsKeys.USER_TYPE])

        session.value = SessionState.SignedIn(MemberProfile(id = "c1", salonId = "s1", firstName = "Omar", role = MemberRole.OWNER))
        assertEquals("c1", tracker.lastUserId)
        assertEquals("c1", crashReporter.userId)
        assertEquals("registered", tracker.properties[AnalyticsKeys.USER_TYPE])

        session.value = SessionState.Guest
        assertNull(tracker.lastUserId)
        assertNull(crashReporter.userId)
        job.cancel()
    }
}
