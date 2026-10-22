package com.fab.wab.merchant.feature.application.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.salon.CompletenessItem
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.feature.application.domain.model.SetupStep
import com.fab.wab.merchant.feature.application.presentation.controller.contract.SetupChecklistContract.SideEffect
import com.fab.wab.merchant.feature.application.presentation.controller.contract.SetupChecklistContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.vm.SetupChecklistViewModel
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

internal fun salon(state: SalonState, missing: Set<CompletenessItem>) = SalonProfile(
    id = "s1", name = "Lina", gender = SalonGenderType.FEMALE, state = state, description = null, coverUrl = null, profileUrl = null,
    location = null, locationText = null, cityId = null, areaId = null, phone = null, whatsapp = null, missing = missing,
    ratingAverage = 0.0, ratingCount = 0,
)

internal class FakeSalonRepository(var result: AppResult<SalonProfile>) : SalonRepository {
    override val current: StateFlow<SalonProfile?> = MutableStateFlow(null)
    override suspend fun refresh(): AppResult<SalonProfile> = result
}

@OptIn(ExperimentalCoroutinesApi::class)
class SetupChecklistViewModelTest {
    private val repository = FakeSalonRepository(AppResult.Success(salon(SalonState.APPLICATION_PENDING, setOf(CompletenessItem.COVER, CompletenessItem.POLICY))))

    private fun TestScope.viewModel() = SetupChecklistViewModel(repository, NoOpAnalyticsTracker, { "failed" }, backgroundScope)
        .also { vm -> backgroundScope.launch { vm.state.collect {} } }

    @Test
    fun progressCountsTheRequiredStepsAndPendingShowsTheNote() = runTest(UnconfinedTestDispatcher()) {
        val state = viewModel().state.first { !it.loading }
        assertEquals(4, state.done)
        assertEquals(6, state.total)
        assertEquals(2, state.remaining)
        assertTrue(state.isPendingApproval)
    }

    @Test
    fun aStepOpensItsScreenAndLiveGoesHome() = runTest(UnconfinedTestDispatcher()) {
        repository.result = AppResult.Success(salon(SalonState.LIVE, emptySet()))
        val vm = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        assertTrue(vm.state.first { !it.loading }.isLive)
        vm.onEvent(UiAction.OnStepClick(SetupStep.HOURS))
        vm.onEvent(UiAction.OnGoHome)
        assertEquals(listOf(SideEffect.OpenStep(SetupStep.HOURS), SideEffect.NavigateHome), effects)
    }

    @Test
    fun loadErrorWithoutContentShowsRetry() = runTest(UnconfinedTestDispatcher()) {
        repository.result = AppResult.Error(AppError.NetworkError("offline"))
        assertEquals("failed", viewModel().state.first { !it.loading }.error)
    }
}
