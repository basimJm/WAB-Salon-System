package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.realtime.FakeRealtimeClient
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.home.domain.usecase.LoadHomeUseCase
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeDependencies
import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeViewModel
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

/** Near you with location allowed (CUS-105/106): Home never waits for the fix, and no fix is never "enable location". */
@OptIn(ExperimentalCoroutinesApi::class)
class HomeNearYouTest {

    private val repository = HomeRepositoryFake()
    private val permissions = PermissionManagerFake(PermissionStatus.GRANTED)
    private var fix: LocationData? = AMMAN

    /** When set, the GPS answers only once this completes (a slow first fix). */
    private var slowFix: CompletableDeferred<LocationData?>? = null

    private fun TestScope.viewModel(session: SessionState = USER): HomeViewModel {
        val provider = object : DeviceLocationProvider {
            override suspend fun currentLocation(): LocationData? = slowFix?.await() ?: fix
        }
        val deps = HomeDependencies(
            loadHome = LoadHomeUseCase(repository),
            currentLocation = GetCurrentLocationUseCase(provider),
            sessionStore = SessionStoreFake(session),
            permissions = PermissionFlow(permissions),
            favorites = FavoritesFake(),
            realtime = FakeRealtimeClient(),
            analytics = NoOpAnalyticsTracker,
            errorText = { "error" },
            languageChanges = MutableStateFlow(AppLanguage.ARABIC),
        )
        val vm = HomeViewModel(deps, testScope = backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        return vm
    }

    @Test
    fun aSlowGpsFixNeverHoldsHomeBack() = runTest(UnconfinedTestDispatcher()) {
        val gps = CompletableDeferred<LocationData?>()
        slowFix = gps
        repository.result = AppResult.Success(content(nearest = HomeSection(listOf(salon("n1")), hasMore = false)))
        val vm = viewModel(USER)
        // The sections are on screen before any fix; Near you shows its placeholder.
        assertEquals(listOf(null), repository.calls.map { it.location })
        assertTrue(vm.state.value.hasContent)
        assertEquals(NearestUi.Locating, vm.state.value.nearYou)
        gps.complete(AMMAN)
        assertEquals(AMMAN, repository.calls.last().location)
        assertIs<NearestUi.Salons>(vm.state.value.nearYou)
    }

    @Test
    fun noGpsFixWithLocationOnOffersARetryNotTheEnablePrompt() = runTest(UnconfinedTestDispatcher()) {
        fix = null
        repository.result = AppResult.Success(content(nearest = HomeSection(listOf(salon("n1")), hasMore = false)))
        val vm = viewModel(USER)
        assertEquals(1, repository.calls.size)
        assertEquals(NearestUi.Unavailable, vm.state.value.nearYou)
        fix = AMMAN
        vm.onEvent(UiAction.OnRetryLocationClick)
        assertEquals(AMMAN, repository.calls.last().location)
        assertIs<NearestUi.Salons>(vm.state.value.nearYou)
    }

    @Test
    fun locationTurnedOffWhileLocatingShowsTheEnablePrompt() = runTest(UnconfinedTestDispatcher()) {
        val gps = CompletableDeferred<LocationData?>()
        slowFix = gps
        fix = null
        val vm = viewModel(USER)
        permissions.status = PermissionStatus.DENIED
        gps.complete(null)
        assertEquals(NearestUi.LocationOff, vm.state.value.nearYou)
    }
}
