package com.fab.wab.merchant.feature.team.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.core.domain.salon.SalonProfile
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.booking.AffectedReasons
import com.fab.wab.merchant.feature.team.domain.Leave
import com.fab.wab.merchant.feature.team.domain.OpenHours
import com.fab.wab.merchant.feature.team.domain.ServiceOption
import com.fab.wab.merchant.feature.team.domain.StaffDay
import com.fab.wab.merchant.feature.team.domain.StaffDraft
import com.fab.wab.merchant.feature.team.domain.StaffField
import com.fab.wab.merchant.feature.team.domain.StaffProfile
import com.fab.wab.merchant.feature.team.domain.StaffRepository
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffMessage
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.SideEffect
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.vm.StaffProfileDependencies
import com.fab.wab.merchant.feature.team.presentation.controller.vm.StaffProfileViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val TODAY = LocalDate(2026, 10, 24)

private class FakeStaff : StaffRepository {
    var profile = StaffProfile("m1", true, "Bio", 4, setOf("s1"), false, listOf(StaffDay(DayOfWeek.SATURDAY)), 4.75, 20, 130)
    val saveResults = ArrayDeque<AppResult<StaffProfile>>()
    val leaveResults = ArrayDeque<AppResult<Leave>>()
    val saved = mutableListOf<StaffDraft>()
    val deleted = mutableListOf<String>()
    override suspend fun profile(memberId: String): AppResult<StaffProfile> = AppResult.Success(profile)
    override suspend fun save(memberId: String, draft: StaffDraft): AppResult<StaffProfile> {
        saved += draft
        return saveResults.removeFirstOrNull() ?: AppResult.Success(
            profile.copy(serviceIds = draft.serviceIds, workingDays = draft.workingDays, providesServices = draft.providesServices),
        )
    }
    override suspend fun leaves(memberId: String): AppResult<List<Leave>> = AppResult.Success(
        listOf(Leave("l1", LocalDate(2026, 11, 1), LocalDate(2026, 11, 2), null, true)),
    )
    override suspend fun addLeave(memberId: String, from: LocalDate, to: LocalDate, note: String): AppResult<Leave> =
        leaveResults.removeFirstOrNull() ?: AppResult.Success(Leave("l2", from, to, note, true))
    override suspend fun updateLeave(memberId: String, leaveId: String, from: LocalDate, to: LocalDate, note: String): AppResult<Leave> =
        AppResult.Success(Leave(leaveId, from, to, note, true))
    override suspend fun deleteLeave(
        memberId: String,
        leaveId: String,
    ): AppResult<Unit> = AppResult.Success(Unit).also { deleted += leaveId }
    override suspend fun services(): AppResult<List<ServiceOption>> = AppResult.Success(
        listOf(ServiceOption("s1", "Cut", true), ServiceOption("s2", "Color", true)),
    )
    override suspend fun salonDays(): AppResult<Map<DayOfWeek, OpenHours?>> =
        AppResult.Success(
            mapOf(DayOfWeek.SATURDAY to OpenHours(540, 1_260), DayOfWeek.SUNDAY to OpenHours(600, 1_200), DayOfWeek.FRIDAY to null),
        )
}

private class FakeSalon : SalonRepository {
    override val current: StateFlow<SalonProfile?> = MutableStateFlow(
        SalonProfile(
            "s", "Lina", SalonGenderType.FEMALE, SalonState.LIVE, null, null, null,
            location = null, locationText = null, cityId = null, areaId = null, phone = null, whatsapp = null,
            missing = emptySet(), ratingAverage = 0.0, ratingCount = 0,
        ),
    )
    override suspend fun refresh(): AppResult<SalonProfile> = AppResult.Error(AppError.NetworkError("x"))
}

@OptIn(ExperimentalCoroutinesApi::class)
class StaffProfileViewModelTest {

    private val staff = FakeStaff()
    private val affected = FakeAffected()

    private fun TestScope.viewModel() = StaffProfileViewModel(
        "m1",
        StaffProfileDependencies(staff, FakeTeam(), FakeSalon(), affected, NoOpAnalyticsTracker, { TODAY }, { "Staff left" }, { "failed" }),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.effectsOf(viewModel: StaffProfileViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

    @Test
    fun loadsProfileOptionsAndLeaves() = runTest(UnconfinedTestDispatcher()) {
        val state = viewModel().state.first { !it.loading && it.leaves.isNotEmpty() }
        assertTrue(state.womenSalon)
        assertEquals(listOf("s1", "s2"), state.services.map { it.id })
        assertEquals("4", state.draft.years)
        assertEquals(listOf("l1"), state.leaves.map { it.id })
    }

    @Test
    fun skillsDaysAndCustomHoursAreValidatedThenSaved() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { it.salonDays.isNotEmpty() }
        viewModel.onEvent(UiAction.OnService("s2"))
        viewModel.onEvent(UiAction.OnDay(DayOfWeek.SUNDAY, true))
        viewModel.onEvent(UiAction.OnCustomHours(DayOfWeek.SUNDAY, true))
        assertEquals(StaffDay(DayOfWeek.SUNDAY, 600, 1_200), viewModel.state.first().draft.workingDays.last())
        viewModel.onEvent(UiAction.OnDayEnd(DayOfWeek.SUNDAY, 1_260))
        viewModel.onEvent(UiAction.OnSave)
        assertEquals(setOf(StaffField.DAYS), viewModel.state.first().visibleErrors)
        assertTrue(staff.saved.isEmpty())
        viewModel.onEvent(UiAction.OnDayEnd(DayOfWeek.SUNDAY, 900))
        viewModel.onEvent(UiAction.OnSave)
        assertEquals(setOf("s1", "s2"), staff.saved.single().serviceIds)
        assertEquals(SideEffect.Done(StaffMessage.PROFILE_SAVED), effects.last())
    }

    @Test
    fun conflictOnSaveCancelsAffectedThenSavesAgain() = runTest(UnconfinedTestDispatcher()) {
        staff.saveResults += scheduleConflict("b1")
        val viewModel = viewModel()
        viewModel.state.first { it.salonDays.isNotEmpty() }
        viewModel.onEvent(UiAction.OnProvides(false))
        viewModel.onEvent(UiAction.OnSave)
        assertEquals(listOf("b1"), viewModel.state.first().conflict?.bookingIds)
        viewModel.onEvent(UiAction.OnConflictCancelBookings)
        assertEquals(AffectedReasons.STAFF_UNAVAILABLE, affected.cancelled.single().second)
        assertEquals(2, staff.saved.size)
        assertNull(viewModel.state.first().conflict)
    }

    @Test
    fun leaveAddWithConflictReassignAndDelete() = runTest(UnconfinedTestDispatcher()) {
        staff.leaveResults += scheduleConflict("b5")
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { it.leaves.isNotEmpty() }
        viewModel.onEvent(UiAction.OnAddLeave)
        viewModel.onEvent(UiAction.OnLeaveFrom(LocalDate(2026, 11, 10)))
        viewModel.onEvent(UiAction.OnLeaveSave)
        viewModel.onEvent(UiAction.OnConflictReassign)
        assertEquals(SideEffect.OpenBooking("b5"), effects.last())
        viewModel.onEvent(UiAction.OnLeaveSave)
        assertTrue(viewModel.state.first().leaves.any { it.id == "l2" })
        viewModel.onEvent(UiAction.OnDeleteLeave("l1"))
        viewModel.onEvent(UiAction.OnDeleteConfirm)
        assertEquals(listOf("l1"), staff.deleted)
        assertEquals(SideEffect.Done(StaffMessage.LEAVE_DELETED), effects.last())
    }
}
