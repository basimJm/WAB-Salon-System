package com.fab.wab.merchant.feature.application.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.feature.application.domain.usecase.GetApplicationUseCase
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationPhase
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationStatusContract.SideEffect
import com.fab.wab.merchant.feature.application.presentation.controller.contract.ApplicationStatusContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.vm.ApplicationStatusViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

@OptIn(ExperimentalCoroutinesApi::class)
class ApplicationStatusViewModelTest {
    private val applications = FakeApplications()
    private val session = RecordingSessionStore()

    private fun TestScope.viewModel() = ApplicationStatusViewModel(
        GetApplicationUseCase(applications, session),
        { "failed" },
        backgroundScope,
    )
        .also { vm -> backgroundScope.launch { vm.state.collect {} } }

    @Test
    fun pendingOffersToPrepareTheProfile() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        assertEquals(ApplicationPhase.PENDING, vm.state.first { !it.loading }.phase)
        assertEquals(SalonState.APPLICATION_PENDING, session.salonState)
        vm.onEvent(UiAction.OnPrepareProfile)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateToChecklist), effects)
    }

    @Test
    fun rejectedShowsTheReasonAndResubmits() = runTest(UnconfinedTestDispatcher()) {
        applications.current = AppResult.Success(
            PENDING_APPLICATION.copy(state = SalonState.APPLICATION_REJECTED, rejectionReason = "Blurry"),
        )
        val vm = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        val state = vm.state.first { !it.loading }
        assertEquals(ApplicationPhase.REJECTED, state.phase)
        assertEquals("Blurry", state.application?.rejectionReason)
        vm.onEvent(UiAction.OnResubmit)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateToResubmit), effects)
    }

    @Test
    fun approvedContinuesToTheChecklistOrHome() = runTest(UnconfinedTestDispatcher()) {
        applications.current = AppResult.Success(PENDING_APPLICATION.copy(state = SalonState.LIVE))
        val vm = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        assertEquals(ApplicationPhase.APPROVED, vm.state.first { !it.loading }.phase)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(listOf<SideEffect>(SideEffect.NavigateHome), effects)
    }

    @Test
    fun firstLoadErrorShowsRetryAndRefreshErrorsAreToasts() = runTest(UnconfinedTestDispatcher()) {
        applications.current = AppResult.Error(AppError.NetworkError("offline"))
        val vm = viewModel()
        assertEquals("failed", vm.state.first { !it.loading }.error)
        applications.current = AppResult.Success(PENDING_APPLICATION)
        vm.onEvent(UiAction.OnRetry)
        assertEquals(ApplicationPhase.PENDING, vm.state.first { it.application != null }.phase)
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        applications.current = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnRefresh)
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("failed")), effects)
    }
}
