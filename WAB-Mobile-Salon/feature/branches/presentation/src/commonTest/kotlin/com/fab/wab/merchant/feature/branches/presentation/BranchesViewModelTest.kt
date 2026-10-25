package com.fab.wab.merchant.feature.branches.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.FieldError
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BlockingBookings
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchOutcome
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.SideEffect
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchesContract.UiAction
import com.fab.wab.merchant.feature.branches.presentation.controller.vm.BranchesViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** MER-062: owner branch list, lifecycle actions and the close conflict. */
@OptIn(ExperimentalCoroutinesApi::class)
class BranchesViewModelTest {
    private val repository = FakeBranches(listOf(branch("a", main = true), branch("b"), branch("c", status = BranchStatus.OFFLINE)))

    private fun TestScope.viewModel() = BranchesViewModel(repository, NoOpAnalyticsTracker, { "failed" }, backgroundScope)
        .also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.effectsOf(vm: BranchesViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { vm.sideEffect.collect { list += it } } }

    @Test
    fun listLoadsAndOnlyAllowedTransitionsRun() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        val effects = effectsOf(vm)
        assertEquals(3, vm.state.first { !it.loading }.branches.size)
        vm.onEvent(UiAction.OnSetMain("a"))
        vm.onEvent(UiAction.OnClose("a"))
        vm.onEvent(UiAction.OnOnline("b"))
        assertNull(vm.state.value.confirmMain, "the main branch is already main")
        assertNull(vm.state.value.confirmClose, "the main branch cannot be closed")
        vm.onEvent(UiAction.OnOnline("c"))
        vm.onEvent(UiAction.OnSetMain("b"))
        vm.onEvent(UiAction.OnConfirmMain)
        assertEquals(listOf("online:c", "main:b"), repository.calls)
        assertEquals(listOf<SideEffect>(SideEffect.Done(BranchOutcome.ONLINE), SideEffect.Done(BranchOutcome.MAIN_SET)), effects)
    }

    @Test
    fun offlineNeedsAReason() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.state.first { !it.loading }
        vm.onEvent(UiAction.OnOffline("b"))
        assertEquals("b", vm.state.value.offlineFor)
        vm.onEvent(UiAction.OnConfirmOffline)
        assertTrue(repository.calls.isEmpty(), "blank reason is not sent")
        vm.onEvent(UiAction.OnOfflineReason("Renovation"))
        vm.onEvent(UiAction.OnConfirmOffline)
        assertEquals(listOf("offline:b:Renovation"), repository.calls)
        assertNull(vm.state.value.offlineFor)
    }

    @Test
    fun closeWithUpcomingBookingsListsThemAndOpensOne() = runTest(UnconfinedTestDispatcher()) {
        repository.failure = AppError.ServerError(
            ErrorCode.BRANCH_HAS_UPCOMING_BOOKINGS, 409, null, listOf(FieldError("k1", "", ""), FieldError("k2", "", "")),
        )
        val vm = viewModel()
        val effects = effectsOf(vm)
        vm.state.first { !it.loading }
        vm.onEvent(UiAction.OnClose("b"))
        vm.onEvent(UiAction.OnConfirmClose)
        assertEquals(BlockingBookings("b", listOf("k1", "k2")), vm.state.value.blocking)
        vm.onEvent(UiAction.OnOpenBooking("k2"))
        assertNull(vm.state.value.blocking)
        assertEquals(listOf<SideEffect>(SideEffect.OpenBooking("k2")), effects)
    }

    @Test
    fun otherErrorsAndLoadFailuresAreShown() = runTest(UnconfinedTestDispatcher()) {
        repository.failure = AppError.ServerError(ErrorCode.LAST_BRANCH, 422, null)
        repository.refreshResult = AppResult.Error(AppError.NetworkError("offline"))
        val empty = FakeBranches(emptyList()).also { it.refreshResult = AppResult.Error(AppError.NetworkError("offline")) }
        val failing = BranchesViewModel(empty, NoOpAnalyticsTracker, { "failed" }, backgroundScope)
        backgroundScope.launch { failing.state.collect { } }
        assertEquals("failed", failing.state.first { !it.loading }.error)
        val vm = viewModel()
        val effects = effectsOf(vm)
        vm.state.first { !it.loading }
        vm.onEvent(UiAction.OnClose("b"))
        vm.onEvent(UiAction.OnConfirmClose)
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("failed"), SideEffect.ShowError("failed")), effects)
        assertNull(vm.state.value.error, "a failed refresh keeps the cached list")
    }
}
