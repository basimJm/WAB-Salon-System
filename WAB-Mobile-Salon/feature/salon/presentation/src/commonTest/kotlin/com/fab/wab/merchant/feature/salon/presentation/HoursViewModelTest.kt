package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.FieldError
import com.fab.wab.merchant.core.domain.booking.AffectedBookingsRepository
import com.fab.wab.merchant.core.domain.booking.AffectedReasons
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.feature.salon.domain.Closure
import com.fab.wab.merchant.feature.salon.domain.DaySchedule
import com.fab.wab.merchant.feature.salon.domain.HoursData
import com.fab.wab.merchant.feature.salon.domain.HoursRepository
import com.fab.wab.merchant.feature.salon.domain.normalizeWeek
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.HoursMessage
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.HoursDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.HoursViewModel
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

private val TODAY = LocalDate(2026, 10, 24)

private fun conflict(vararg ids: String) =
    AppResult.Error(AppError.ServerError(ErrorCode.SCHEDULE_CONFLICT, 409, null, ids.map { FieldError(it, "SCHEDULE_CONFLICT", "") }))

private class FakeHours : HoursRepository {
    var week = normalizeWeek(listOf(DaySchedule(DayOfWeek.SATURDAY, false, 540, 1_260)))
    var closures = listOf(
        Closure("old", LocalDate(2026, 10, 1), LocalDate(2026, 10, 2), "Eid", false),
        Closure("next", LocalDate(2026, 11, 1), LocalDate(2026, 11, 1), "Maintenance", true),
    )
    val conflicts = ArrayDeque<AppResult.Error>()
    var saved: List<DaySchedule>? = null
    val branchIds = mutableListOf<String?>()
    override suspend fun load(branchId: String?): AppResult<HoursData> {
        branchIds += branchId
        return AppResult.Success(HoursData(week, closures))
    }
    override suspend fun saveWeek(days: List<DaySchedule>, branchId: String?): AppResult<HoursData> =
        conflicts.removeFirstOrNull() ?: AppResult.Success(HoursData(days, closures)).also { saved = days; week = days }
    override suspend fun addClosure(from: LocalDate, to: LocalDate, reason: String, branchId: String?): AppResult<Closure> =
        conflicts.removeFirstOrNull() ?: AppResult.Success(Closure("new", from, to, reason, true))
    override suspend fun updateClosure(id: String, from: LocalDate, to: LocalDate, reason: String, branchId: String?): AppResult<Closure> =
        AppResult.Success(Closure(id, from, to, reason, true))
    override suspend fun deleteClosure(id: String, branchId: String?): AppResult<Unit> = AppResult.Success(Unit)
}

private class FakeAffected : AffectedBookingsRepository {
    val cancelled = mutableListOf<Triple<List<String>, String, String>>()
    override suspend fun cancel(bookingIds: List<String>, reasonCode: String, reasonText: String): AppResult<Boolean> {
        cancelled += Triple(bookingIds, reasonCode, reasonText)
        return AppResult.Success(true)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class HoursViewModelTest {

    private val hours = FakeHours()
    private val affected = FakeAffected()

    private fun TestScope.viewModel() = HoursViewModel(
        HoursDependencies(hours, affected, NoOpAnalyticsTracker, { TODAY }, { "Hours changed" }, { "failed" }),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.effectsOf(viewModel: HoursViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

    @Test
    fun editValidateCopyAndSaveTheWeek() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        val loaded = viewModel.state.first { !it.loading }
        assertFalse(loaded.canSaveWeek)
        assertEquals(listOf("next"), loaded.upcoming.map { it.id })
        assertEquals(listOf("old"), loaded.past.map { it.id })
        viewModel.onEvent(UiAction.OnToggleDay(DayOfWeek.SUNDAY, true))
        viewModel.onEvent(UiAction.OnCloseTime(DayOfWeek.SATURDAY, 480))
        assertEquals(setOf(DayOfWeek.SATURDAY), viewModel.state.first().invalidDays)
        assertFalse(viewModel.state.first().canSaveWeek)
        viewModel.onEvent(UiAction.OnCloseTime(DayOfWeek.SATURDAY, 1_200))
        viewModel.onEvent(UiAction.OnCopyToAll(DayOfWeek.SATURDAY))
        assertEquals(1_200, viewModel.state.first().week.first { it.day == DayOfWeek.SUNDAY }.closeMinute)
        viewModel.onEvent(UiAction.OnSaveWeek)
        assertEquals(1_200, hours.saved?.first { it.day == DayOfWeek.SUNDAY }?.closeMinute)
        assertEquals(SideEffect.Done(HoursMessage.WEEK_SAVED), effects.last())
        assertFalse(viewModel.state.first().canSaveWeek)
    }

    @Test
    fun conflictListsBookingsThenCancelsAndSavesAgain() = runTest(UnconfinedTestDispatcher()) {
        hours.conflicts += conflict("b1", "b2")
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnToggleDay(DayOfWeek.SATURDAY, false))
        viewModel.onEvent(UiAction.OnSaveWeek)
        assertEquals(listOf("b1", "b2"), viewModel.state.first().conflict?.bookingIds)
        assertNull(hours.saved)
        viewModel.onEvent(UiAction.OnConflictCancelBookings)
        assertEquals(Triple(listOf("b1", "b2"), AffectedReasons.OTHER, "Hours changed"), affected.cancelled.single())
        assertTrue(hours.saved?.first { it.day == DayOfWeek.SATURDAY }?.isOff == true)
        assertEquals(SideEffect.Done(HoursMessage.WEEK_SAVED, 2), effects.last())
    }

    @Test
    fun closureAddWithConflictGoBackThenEditAndDelete() = runTest(UnconfinedTestDispatcher()) {
        hours.conflicts += conflict("b9")
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnAddClosure)
        viewModel.onEvent(UiAction.OnClosureFrom(LocalDate(2026, 11, 5)))
        assertEquals(LocalDate(2026, 11, 5), viewModel.state.first().closureSheet?.to)
        viewModel.onEvent(UiAction.OnClosureSave)
        assertTrue(affected.cancelled.isEmpty())
        viewModel.onEvent(UiAction.OnClosureReason("Eid holiday"))
        viewModel.onEvent(UiAction.OnClosureSave)
        assertEquals(listOf("b9"), viewModel.state.first().conflict?.bookingIds)
        viewModel.onEvent(UiAction.OnDialogDismiss)
        assertNull(viewModel.state.first().conflict)
        viewModel.onEvent(UiAction.OnClosureSave)
        assertEquals(SideEffect.Done(HoursMessage.CLOSURE_ADDED), effects.last())
        assertTrue(viewModel.state.first().closures.any { it.id == "new" })
        viewModel.onEvent(UiAction.OnEditClosure("old"))
        assertNull(viewModel.state.first().closureSheet)
        viewModel.onEvent(UiAction.OnDeleteClosure("next"))
        viewModel.onEvent(UiAction.OnDeleteConfirm)
        assertEquals(SideEffect.Done(HoursMessage.CLOSURE_DELETED), effects.last())
        assertFalse(viewModel.state.first().closures.any { it.id == "next" })
    }

    @Test
    fun ownerEditsTheMainBranchFirstThenTheChosenOne() = runTest(UnconfinedTestDispatcher()) {
        val branches = listOf("b1", "b2").map {
            Branch(it, BranchName(it, it), it == "b1", BranchStatus.ACTIVE, null, null, null, null, null, null, null, emptyList())
        }
        val scope = MutableStateFlow(BranchScope(MemberScope.AllBranches, branches, null))
        val selected = mutableListOf<String?>()
        val viewModel = HoursViewModel(
            HoursDependencies(
                hours, affected, NoOpAnalyticsTracker, { TODAY }, { "Hours changed" }, { "failed" }, scope, { selected += it },
            ),
            testScope = backgroundScope,
        ).also { vm -> backgroundScope.launch { vm.state.collect { } } }
        viewModel.state.first { !it.loading && it.branchScope.edited == "b1" }
        assertEquals("b1", hours.branchIds.last(), "the main branch until another is chosen")
        viewModel.onEvent(UiAction.OnBranchSelect("b2"))
        assertEquals(listOf<String?>("b2"), selected)
        scope.value = scope.value.copy(selected = "b2")
        viewModel.state.first { it.branchScope.edited == "b2" && !it.loading }
        assertEquals("b2", hours.branchIds.last())
    }

    @Test
    fun branchMembersUseTheSalonLevelCalls() = runTest(UnconfinedTestDispatcher()) {
        viewModel().state.first { !it.loading }
        assertTrue(hours.branchIds.all { it == null })
    }
}
