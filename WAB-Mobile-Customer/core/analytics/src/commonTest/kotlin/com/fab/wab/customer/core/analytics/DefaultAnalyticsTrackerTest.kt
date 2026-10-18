package com.fab.wab.customer.core.analytics

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val CONTEXT = AnalyticsContext(
    userType = AnalyticsUserType.GUEST,
    genderScope = "women",
    language = "ar",
    appVersion = "1.0",
    platform = "android",
    environment = "dev",
)

@OptIn(ExperimentalCoroutinesApi::class)
class DefaultAnalyticsTrackerTest {

    private val backend = RecordingAnalyticsBackend()
    private val reported = mutableListOf<Pair<AnalyticsEvent, List<AnalyticsIssue>>>()

    private fun tracker(scope: kotlinx.coroutines.CoroutineScope, context: AnalyticsContext = CONTEXT) =
        DefaultAnalyticsTracker(backend, { context }, scope) { event, issues -> reported += event to issues }

    @Test
    fun screenViewCarriesScreenNameAndCommonFields() = runTest(UnconfinedTestDispatcher()) {
        tracker(this).trackScreen(AnalyticsScreen("salon_details", analyticsParams { text(AnalyticsKeys.SALON_ID, "s1") }))
        val event = backend.events.single()
        assertEquals(AnalyticsEventNames.SCREEN_VIEW, event.name)
        assertEquals(AnalyticsValue.Text("salon_details"), event.params[AnalyticsKeys.SCREEN_NAME])
        assertEquals(AnalyticsValue.Text("s1"), event.params[AnalyticsKeys.SALON_ID])
        assertEquals(AnalyticsValue.Text("guest"), event.params[AnalyticsKeys.USER_TYPE])
        assertEquals(AnalyticsValue.Text("women"), event.params[AnalyticsKeys.GENDER_SCOPE])
        assertEquals(AnalyticsValue.Text("ar"), event.params[AnalyticsKeys.LANGUAGE])
        assertEquals(AnalyticsValue.Text("1.0"), event.params[AnalyticsKeys.APP_VERSION])
        assertEquals(AnalyticsValue.Text("android"), event.params[AnalyticsKeys.PLATFORM])
        assertEquals(AnalyticsValue.Text("dev"), event.params[AnalyticsKeys.ENVIRONMENT])
    }

    @Test
    fun eventParamsWinOverContextParams() = runTest(UnconfinedTestDispatcher()) {
        tracker(this).trackAction(AnalyticsAction("gender_tab_switch", analyticsParams { text(AnalyticsKeys.GENDER_SCOPE, "men") }))
        assertEquals(AnalyticsValue.Text("men"), backend.events.single().params[AnalyticsKeys.GENDER_SCOPE])
    }

    @Test
    fun missingGenderScopeIsOmitted() = runTest(UnconfinedTestDispatcher()) {
        tracker(this, CONTEXT.copy(genderScope = null)).trackAction(AnalyticsAction("onboarding_skip"))
        assertNull(backend.events.single().params[AnalyticsKeys.GENDER_SCOPE])
    }

    @Test
    fun invalidEventsAreReportedNotSent() = runTest(UnconfinedTestDispatcher()) {
        tracker(this).trackAction(AnalyticsAction("Bad Name"))
        assertTrue(backend.events.isEmpty())
        assertEquals("Bad Name", reported.single().first.name)
        assertEquals(listOf(AnalyticsIssue.InvalidName("Bad Name")), reported.single().second)
    }

    @Test
    fun longTextValuesAreTruncatedBeforeSending() = runTest(UnconfinedTestDispatcher()) {
        val long = "q".repeat(AnalyticsLimits.MAX_PARAM_VALUE_LENGTH * 2)
        tracker(this).trackAction(AnalyticsAction("search_query", analyticsParams { text("query", long) }))
        val sent = backend.events.single().params["query"] as AnalyticsValue.Text
        assertEquals(AnalyticsLimits.MAX_PARAM_VALUE_LENGTH, sent.value.length)
    }

    @Test
    fun userIdAndPropertiesReachTheBackend() = runTest(UnconfinedTestDispatcher()) {
        val tracker = tracker(this)
        tracker.setUserId("customer-1")
        tracker.setUserProperty("gender", "women")
        assertEquals("customer-1", backend.userId)
        assertEquals(mapOf("gender" to "women"), backend.userProperties)
        tracker.setUserId(null)
        assertNull(backend.userId)
    }

    @Test
    fun compositeBackendFansOut() = runTest(UnconfinedTestDispatcher()) {
        val second = RecordingAnalyticsBackend()
        val composite = CompositeAnalyticsBackend(listOf(backend, second))
        DefaultAnalyticsTracker(composite, { CONTEXT }, this).trackAction(AnalyticsAction("banner_click"))
        assertEquals(1, backend.events.size)
        assertEquals(1, second.events.size)
        backend.clear()
        assertTrue(backend.events.isEmpty())
    }
}
