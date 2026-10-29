package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.salon.CompletenessItem
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.feature.salon.domain.HubTile
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.SalonHubContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonHubViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class SalonHubViewModelTest {

    private val salon = FakeSalon(AppResult.Success(salon(setOf(CompletenessItem.STAFF))))
    private val session = MutableStateFlow<SessionState>(SessionState.SignedIn(MemberProfile("m1", "s1", "Huda", MemberRole.OWNER)))

    private fun TestScope.viewModel() = SalonHubViewModel(salon, session, NoOpAnalyticsTracker, { "failed" }, backgroundScope)
        .also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun tilesFollowPermissionsAndCompleteness() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val owner = viewModel.state.first { it.salon != null }
        assertEquals(HubTile.entries.size, owner.entries.size)
        assertEquals(listOf(HubTile.TEAM), owner.entries.filter { it.missing }.map { it.tile })
        session.value = SessionState.SignedIn(MemberProfile("m2", "s1", "Rana", MemberRole.EMPLOYEE), setOf("BOOKINGS_VIEW_OWN"))
        assertTrue(viewModel.state.first().noAccess)
    }

    @Test
    fun tileClickOpensAndRefreshErrorsAreShown() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.onEvent(UiAction.OnTileClick(HubTile.SERVICES))
        assertEquals(SideEffect.Open(HubTile.SERVICES), effects.last())
        salon.result = AppResult.Error(AppError.NetworkError("offline"))
        viewModel.onEvent(UiAction.OnRefresh)
        assertEquals(SideEffect.ShowError("failed"), effects.last())
        assertEquals(2, salon.refreshes)
    }
}
