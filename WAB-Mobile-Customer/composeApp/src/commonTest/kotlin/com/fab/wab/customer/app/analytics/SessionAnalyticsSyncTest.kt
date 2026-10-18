package com.fab.wab.customer.app.analytics

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.AnalyticsKeys
import com.fab.wab.customer.core.analytics.AnalyticsScreen
import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.firebase.FakeCrashReporter
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

    private val session = MutableStateFlow<SessionState>(SessionState.Guest())
    private val tracker = RecordingTracker()
    private val crashReporter = FakeCrashReporter()

    @Test
    fun userIdFollowsLoginAndLogoutOnAnalyticsAndCrashReports() = runTest(UnconfinedTestDispatcher()) {
        val job = SessionAnalyticsSync(session, tracker, crashReporter).start(backgroundScope)
        assertNull(tracker.lastUserId)
        assertEquals("guest", tracker.properties[AnalyticsKeys.USER_TYPE])
        assertNull(tracker.properties[AnalyticsKeys.GENDER_SCOPE])

        session.value = SessionState.SignedIn(UserProfile(id = "c1", firstName = "Omar", gender = Gender.MALE))
        assertEquals("c1", tracker.lastUserId)
        assertEquals("c1", crashReporter.userId)
        assertEquals("registered", tracker.properties[AnalyticsKeys.USER_TYPE])
        assertEquals("male", tracker.properties[AnalyticsKeys.GENDER_SCOPE])

        session.value = SessionState.Guest(GuestProfile(gender = Gender.FEMALE))
        assertNull(tracker.lastUserId)
        assertNull(crashReporter.userId)
        assertEquals("female", tracker.properties[AnalyticsKeys.GENDER_SCOPE])
        job.cancel()
    }
}
