package com.fab.wab.merchant.feature.home.presentation

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsScreen
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.feature.home.domain.Dashboard
import com.fab.wab.merchant.feature.home.domain.DashboardBooking
import com.fab.wab.merchant.feature.home.domain.DashboardRepository
import com.fab.wab.merchant.feature.home.domain.DashboardSalon
import com.fab.wab.merchant.feature.home.domain.PendingRequests
import com.fab.wab.merchant.feature.home.domain.QuickStats
import com.fab.wab.merchant.feature.home.domain.SubscriptionWarning
import com.fab.wab.merchant.feature.home.domain.TodayOverview
import com.fab.wab.merchant.feature.home.presentation.analytics.HomeAnalytics
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.SideEffect
import com.fab.wab.merchant.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.merchant.feature.home.presentation.controller.vm.HomeDependencies
import com.fab.wab.merchant.feature.home.presentation.controller.vm.HomeViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private fun booking(id: String) = DashboardBooking(
    id, "WAB-$id", null, false, "2026-10-25T10:00:00Z", "2026-10-25T11:00:00Z", "2026-10-25T11:00:00Z",
    "2026-10-25T08:00:00Z", 1, "Huda", listOf("Sara"), null,
)

private val DASHBOARD = Dashboard(
    salon = DashboardSalon("s", "Bella", null, SalonState.LIVE, emptyList()),
    subscriptionWarning = SubscriptionWarning("2026-10-30T21:00:00Z", 5),
    unreadNotifications = 3,
    pending = PendingRequests(2, listOf(booking("b1"))),
    today = TodayOverview(1, 0, booking("b2"), emptyList()),
    quickStats = QuickStats(38, "1240.500", 4.8),
)

private class FakeDashboard : DashboardRepository {
    var calls = 0
    var fail = false
    override suspend fun dashboard(): AppResult<Dashboard> {
        calls += 1
        return if (fail) AppResult.Error(AppError.NetworkError("x")) else AppResult.Success(DASHBOARD)
    }
}

private class RecordingTracker : AnalyticsTracker {
    val actions = mutableListOf<AnalyticsAction>()
    override fun trackScreen(screen: AnalyticsScreen) = Unit
    override fun trackAction(action: AnalyticsAction) {
        actions += action
    }
    override fun trackRoute(route: String?) = Unit
    override fun setUserId(userId: String?) = Unit
    override fun setUserProperty(key: String, value: String?) = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    private val repo = FakeDashboard()
    private val tracker = RecordingTracker()
    private var permissionRefreshes = 0
    private val changes = MutableSharedFlow<Unit>()

    private fun TestScope.viewModel(role: MemberRole = MemberRole.OWNER, keys: Set<String> = emptySet()) = HomeViewModel(
        HomeDependencies(
            dashboard = repo,
            session = flowOf(SessionState.SignedIn(MemberProfile("m", "s", "Layla", role), keys)),
            refreshPermissions = { permissionRefreshes += 1 },
            analytics = tracker,
            clock = flowOf(NOW),
            bookingChanges = changes,
            errorText = { "failed" },
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun ownerSeesEveryBlockFromOneCall() = runTest(UnconfinedTestDispatcher()) {
        val state = viewModel().state.first { !it.loading }
        assertEquals(1, repo.calls)
        assertEquals("Layla", state.memberName)
        assertTrue(state.showsPending && state.showsStatistics && state.showsSubscriptionWarning)
        assertFalse(state.ownBookingsOnly)
        assertTrue(state.hasNoBookingsToday)
        assertFalse(state.incomplete)
        assertEquals(NOW, state.nowMs)
    }

    @Test
    fun employeeBlocksAreHiddenByPermission() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel(MemberRole.EMPLOYEE, setOf("DASHBOARD_VIEW", "BOOKINGS_VIEW_OWN"))
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        val state = viewModel.state.first { !it.loading }
        assertFalse(state.showsPending || state.showsStatistics || state.showsSubscriptionWarning)
        assertTrue(state.ownBookingsOnly)
        viewModel.onEvent(UiAction.OnSubscription)
        assertTrue(effects.isEmpty(), "no subscription screen without SUBSCRIPTION_VIEW")
    }

    @Test
    fun pullToRefreshAlsoRefreshesPermissionsAndKeepsContentOnFailure() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        viewModel.state.first { !it.loading }
        repo.fail = true
        viewModel.onEvent(UiAction.OnRefresh)
        val state = viewModel.state.first { !it.refreshing }
        assertEquals(1, permissionRefreshes)
        assertEquals(2, repo.calls)
        assertEquals(DASHBOARD, state.dashboard)
        assertNull(state.error)
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("failed")), effects)
        assertEquals(HomeAnalytics.ACTION_REFRESH, tracker.actions.single().name)
    }

    @Test
    fun firstLoadErrorShowsRetryThenContent() = runTest(UnconfinedTestDispatcher()) {
        repo.fail = true
        val viewModel = viewModel()
        assertEquals("failed", viewModel.state.first { !it.loading }.error)
        repo.fail = false
        viewModel.onEvent(UiAction.OnRetry)
        val state = viewModel.state.first { it.dashboard != null }
        assertNull(state.error)
    }

    @Test
    fun bookingEventsAndResumeReloadSilentlyAndTapsNavigate() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        viewModel.state.first { !it.loading }
        changes.emit(Unit)
        viewModel.onEvent(UiAction.OnResume)
        assertEquals(3, repo.calls)
        viewModel.onEvent(UiAction.OnBooking("b1"))
        viewModel.onEvent(UiAction.OnViewAllRequests)
        viewModel.onEvent(UiAction.OnNotifications)
        viewModel.onEvent(UiAction.OnCalendar)
        viewModel.onEvent(UiAction.OnSetup)
        viewModel.onEvent(UiAction.OnSubscription)
        assertEquals(
            listOf(
                SideEffect.OpenBooking("b1"),
                SideEffect.OpenPendingRequests,
                SideEffect.OpenNotifications,
                SideEffect.OpenCalendar,
                SideEffect.OpenSetup,
                SideEffect.OpenSubscription,
            ),
            effects,
        )
    }

    private companion object {
        const val NOW = 1_761_400_000_000L
    }
}
