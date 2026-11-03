package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.feature.bookings.domain.model.BookingFilter
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsDefaults
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsTab
import com.fab.wab.merchant.feature.bookings.domain.model.BranchRef
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsViewModel
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
class BookingsViewModelTest {

    private val repository = FakeBookingsRepository()
    private val changes = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private val clock = MutableSharedFlow<Long>(extraBufferCapacity = 1)

    private fun TestScope.viewModel() = BookingsViewModel(
        BookingsDependencies(repository, changes, clock, NoOpAnalyticsTracker, errorText = { "failed" }),
        testScope = backgroundScope,
    )

    private fun fullPage(prefix: String) = (1..BookingsDefaults.PAGE_SIZE).map { summary("$prefix$it") }

    @Test
    fun firstPageLoadsPendingThenPagesAndDeduplicates() = runTest(UnconfinedTestDispatcher()) {
        repository.pages[1] = fullPage("a")
        repository.pages[2] = listOf(summary("a1"), summary("b1"))
        val viewModel = viewModel()
        val loaded = viewModel.state.first { !it.loading }
        assertEquals(BookingsTab.PENDING, loaded.tab)
        assertTrue(loaded.hasMore)
        assertEquals(listOf(SARA, LINA), loaded.staffOptions)
        viewModel.onEvent(UiAction.OnLoadMore)
        val more = viewModel.state.first()
        assertEquals(BookingsDefaults.PAGE_SIZE + 1, more.items.size)
        assertFalse(more.hasMore)
        assertEquals(2, repository.queries.last().second)
    }

    @Test
    fun tabFilterAndRealtimeChangesReloadTheFirstPage() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnTabSelect(BookingsTab.TODAY))
        assertEquals(BookingsTab.TODAY, repository.queries.last().first.tab)
        // MER-086 (§5.21): the "To close" tab asks the server for `tab=TO_CLOSE`.
        viewModel.onEvent(UiAction.OnTabSelect(BookingsTab.TO_CLOSE))
        assertEquals(BookingsTab.TO_CLOSE, repository.queries.last().first.tab)
        assertEquals("TO_CLOSE", BookingsTab.TO_CLOSE.name)
        val filter = BookingFilter(statuses = setOf(BookingStatus.APPROVED), brideOnly = true)
        viewModel.onEvent(UiAction.OnFilterApply(filter))
        assertEquals(filter, repository.queries.last().first.filter)
        assertEquals(2, filter.activeCount)
        val before = repository.queries.size
        changes.emit(Unit)
        assertEquals(before + 1, repository.queries.size)
        assertEquals(1, repository.queries.last().second)
        clock.emit(NOW)
        assertEquals(NOW, viewModel.state.first().nowMs)
    }

    @Test
    fun searchIsDebounced() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        backgroundScope.launch { viewModel.state.collect { } }
        viewModel.state.first { !it.loading }
        val before = repository.queries.size
        viewModel.onEvent(UiAction.OnQueryChange("ra"))
        viewModel.onEvent(UiAction.OnQueryChange("rana"))
        advanceTimeBy(BookingsDefaults.SEARCH_DEBOUNCE_MS / 2)
        assertEquals(before, repository.queries.size)
        advanceTimeBy(BookingsDefaults.SEARCH_DEBOUNCE_MS)
        assertEquals(before + 1, repository.queries.size)
        assertEquals("rana", repository.queries.last().first.text)
    }

    @Test
    fun errorsShowRetryOrABannerAndClicksOpenDetails() = runTest(UnconfinedTestDispatcher()) {
        repository.listError = AppResult.Error(AppError.NetworkError("offline"))
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        assertEquals("failed", viewModel.state.first { !it.loading }.error)
        repository.listError = null
        repository.pages[1] = listOf(summary("x"))
        viewModel.onEvent(UiAction.OnRetry)
        assertEquals(1, viewModel.state.first { !it.loading }.items.size)
        repository.listError = AppResult.Error(AppError.NetworkError("offline"))
        viewModel.onEvent(UiAction.OnRefresh)
        assertEquals(SideEffect.ShowError("failed"), effects.last())
        assertEquals(1, viewModel.state.first().items.size)
        viewModel.onEvent(UiAction.OnBookingClick("x"))
        assertEquals(SideEffect.OpenDetails("x"), effects.last())
    }

    @Test
    fun ownerSwitcherFiltersTheListAndTheStaffAndCardsShowTheBranch() = runTest(UnconfinedTestDispatcher()) {
        val branches = listOf("b1", "b2").map {
            Branch(it, BranchName(it, it), it == "b1", BranchStatus.ACTIVE, null, null, null, null, null, null, null, emptyList())
        }
        val scope = MutableStateFlow(BranchScope(MemberScope.AllBranches, branches, null))
        repository.staffList = listOf(SARA.copy(branchId = "b1"), LINA.copy(branchId = "b2"))
        repository.pages[1] = listOf(summary("a1").copy(branch = BranchRef("b1", "Abdoun", null)))
        val selected = mutableListOf<String?>()
        val viewModel = BookingsViewModel(
            BookingsDependencies(
                repository, changes, clock, NoOpAnalyticsTracker, errorText = { "failed" }, branchScope = scope,
                selectBranch = { selected += it },
            ),
            testScope = backgroundScope,
        )
        val all = viewModel.state.first { !it.loading }
        assertTrue(all.showsBranchOnCards)
        assertNull(repository.queries.last().first.branchId)
        assertEquals(2, all.visibleStaff.size)
        viewModel.onEvent(UiAction.OnBranchSelect("b2"))
        assertEquals(listOf<String?>("b2"), selected)
        scope.value = scope.value.copy(selected = "b2")
        val one = viewModel.state.first { it.branchScope.filter == "b2" }
        assertEquals("b2", repository.queries.last().first.branchId)
        assertEquals(listOf(LINA.copy(branchId = "b2")), one.visibleStaff)
        assertFalse(one.showsBranchOnCards)
    }

    @Test
    fun branchMembersNeverSendABranchFilter() = runTest(UnconfinedTestDispatcher()) {
        val scope = MutableStateFlow(BranchScope(MemberScope.OneBranch("b2"), emptyList(), "b1"))
        val viewModel = BookingsViewModel(
            BookingsDependencies(repository, changes, clock, NoOpAnalyticsTracker, errorText = { "failed" }, branchScope = scope),
            testScope = backgroundScope,
        )
        assertFalse(viewModel.state.first { !it.loading }.branchScope.showsSwitcher)
        assertNull(repository.queries.last().first.branchId)
    }

    @Test
    fun newBookingEntryFollowsBookingsCreatePermission() = runTest(UnconfinedTestDispatcher()) {
        val allowed = MutableStateFlow(false)
        val viewModel = BookingsViewModel(
            BookingsDependencies(repository, changes, clock, NoOpAnalyticsTracker, errorText = { "failed" }, canCreate = allowed),
            testScope = backgroundScope,
        )
        assertFalse(viewModel.state.first { !it.loading }.canCreate, "hidden without BOOKINGS_CREATE")
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        viewModel.onEvent(UiAction.OnNewBooking)
        assertTrue(effects.isEmpty())
        allowed.value = true
        assertTrue(viewModel.state.first().canCreate)
        viewModel.onEvent(UiAction.OnNewBooking)
        assertEquals(listOf<SideEffect>(SideEffect.OpenNewBooking), effects)
    }

    private companion object {
        const val NOW = 42L
    }
}
