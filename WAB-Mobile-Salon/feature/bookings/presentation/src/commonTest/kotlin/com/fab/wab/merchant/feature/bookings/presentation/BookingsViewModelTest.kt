package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.feature.bookings.domain.model.BookingFilter
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsDefaults
import com.fab.wab.merchant.feature.bookings.domain.model.BookingsTab
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.BookingsContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

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

    private companion object {
        const val NOW = 42L
    }
}
