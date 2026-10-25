package com.fab.wab.merchant.feature.bookings.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.designsystem.components.calendar.CalendarMode
import com.fab.wab.merchant.feature.bookings.domain.model.CalendarEntry
import com.fab.wab.merchant.feature.bookings.domain.model.SalonHours
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import com.fab.wab.merchant.feature.bookings.domain.repository.CalendarRepository
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.SideEffect
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.CalendarContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.CalendarDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.CalendarViewModel
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.time.Instant
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.LocalDate

private class FakeCalendarRepository : CalendarRepository {
    val requests = mutableListOf<Triple<LocalDate, LocalDate, Set<String>>>()
    var result: AppResult<List<CalendarEntry>> = AppResult.Success(emptyList())
    override suspend fun entries(from: LocalDate, to: LocalDate, staffIds: Set<String>): AppResult<List<CalendarEntry>> {
        requests += Triple(from, to, staffIds)
        return result
    }
    override suspend fun hours(): AppResult<SalonHours> = AppResult.Success(SalonHours(emptyMap(), emptyList()))
}

@OptIn(ExperimentalCoroutinesApi::class)
class CalendarViewModelTest {

    private val calendar = FakeCalendarRepository()
    private val changes = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private val today = LocalDate(2026, 10, 24)

    private fun session(vararg permissions: String) =
        SessionState.SignedIn(MemberProfile("me", "salon", "Huda", MemberRole.EMPLOYEE), permissions.toSet())

    private fun TestScope.viewModel(state: SessionState = session("BOOKINGS_VIEW_ALL")) = CalendarViewModel(
        CalendarDependencies(
            calendar = calendar,
            bookings = FakeBookingsRepository(),
            session = flowOf(state),
            changes = changes,
            clock = emptyFlow(),
            today = { today },
            analytics = NoOpAnalyticsTracker,
            errorText = { "failed" },
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun dayThenWeekLoadTheirRangeAndPagingMovesByMode() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        assertEquals(Triple(today, today, emptySet<String>()), calendar.requests.last())
        assertEquals(listOf(SARA, LINA), viewModel.state.first().staff)
        viewModel.onEvent(UiAction.OnModeChange(CalendarMode.WEEK))
        // Saturday-first week of Sat 24 Oct.
        assertEquals(today to LocalDate(2026, 10, 30), calendar.requests.last().let { it.first to it.second })
        val before = calendar.requests.size
        viewModel.onEvent(UiAction.OnDatePick(LocalDate(2026, 10, 27)))
        assertEquals(before, calendar.requests.size)
        viewModel.onEvent(UiAction.OnPage(forward = true))
        assertEquals(LocalDate(2026, 10, 31), calendar.requests.last().first)
        viewModel.onEvent(UiAction.OnDayClick("2026-11-02"))
        val state = viewModel.state.first()
        assertEquals(CalendarMode.DAY, state.mode)
        assertEquals(LocalDate(2026, 11, 2), calendar.requests.last().first)
        viewModel.onEvent(UiAction.OnToday)
        assertEquals(today, viewModel.state.first().date)
    }

    @Test
    fun staffFilterIsSentAndViewOwnGetsOnlyItsColumn() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.onEvent(UiAction.OnFilterClick)
        assertTrue(viewModel.state.first().filterOpen)
        viewModel.onEvent(UiAction.OnFilterApply(setOf("s2")))
        assertEquals(setOf("s2"), calendar.requests.last().third)
        assertFalse(viewModel.state.first().filterOpen)

        val own = viewModel(session("BOOKINGS_VIEW_OWN"))
        val state = own.state.first()
        assertEquals(StaffRef("me", "Huda"), state.own)
        assertTrue(state.staff.isEmpty())
        own.onEvent(UiAction.OnFilterClick)
        assertFalse(own.state.first().filterOpen)
    }

    @Test
    fun realtimeReloadsSilentlyAndErrorsShowRetry() = runTest(UnconfinedTestDispatcher()) {
        calendar.result = AppResult.Error(AppError.NetworkError("offline"))
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>()
        backgroundScope.launch { viewModel.sideEffect.collect { effects += it } }
        assertEquals("failed", viewModel.state.first().error)
        calendar.result = AppResult.Success(emptyList())
        viewModel.onEvent(UiAction.OnRetry)
        assertNull(viewModel.state.first().error)
        val before = calendar.requests.size
        changes.emit(Unit)
        assertEquals(before + 1, calendar.requests.size)
        viewModel.onEvent(UiAction.OnBlockClick("b1"))
        assertEquals(SideEffect.OpenDetails("b1"), effects.last())
    }

    @Test
    fun ownerBranchChoiceNarrowsColumnsAndBlocksToThatBranchStaff() = runTest(UnconfinedTestDispatcher()) {
        val branches = listOf("b1", "b2").map {
            Branch(it, BranchName(it, it), it == "b1", BranchStatus.ACTIVE, null, null, null, null, null, null, null, emptyList())
        }
        val scope = MutableStateFlow(BranchScope(MemberScope.AllBranches, branches, null))
        val bookings = FakeBookingsRepository().apply { staffList = listOf(SARA.copy(branchId = "b1"), LINA.copy(branchId = "b2")) }
        val at = Instant.parse("2026-10-24T08:00:00Z")
        calendar.result = AppResult.Success(
            listOf(
                CalendarEntry("k1", "WAB-1", com.fab.wab.merchant.core.domain.booking.BookingStatus.APPROVED, "s1", "Rana", false, at, at),
                CalendarEntry("k2", "WAB-2", com.fab.wab.merchant.core.domain.booking.BookingStatus.APPROVED, "s2", "Noor", false, at, at),
            ),
        )
        val selected = mutableListOf<String?>()
        val viewModel = CalendarViewModel(
            CalendarDependencies(
                calendar, bookings, flowOf(session("BOOKINGS_VIEW_ALL")), changes, emptyFlow(), { today }, NoOpAnalyticsTracker,
                { "failed" }, scope, { selected += it },
            ),
            testScope = backgroundScope,
        ).also { vm -> backgroundScope.launch { vm.state.collect { } } }
        assertEquals(2, viewModel.state.first { !it.loading }.visibleEntries.size)
        viewModel.onEvent(UiAction.OnBranchSelect("b2"))
        assertEquals(listOf<String?>("b2"), selected)
        scope.value = scope.value.copy(selected = "b2")
        val narrowed = viewModel.state.first { it.branchScope.filter == "b2" && !it.loading }
        assertEquals(listOf("s2"), narrowed.visibleStaff.map { it.id })
        assertEquals(listOf("k2"), narrowed.visibleEntries.map { it.bookingId })
        assertEquals(setOf("s2"), calendar.requests.last().third, "the server call asks for that branch's staff")
    }
}
