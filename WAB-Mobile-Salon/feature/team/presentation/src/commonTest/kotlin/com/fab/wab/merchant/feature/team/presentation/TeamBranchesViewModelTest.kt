package com.fab.wab.merchant.feature.team.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.booking.AffectedReasons
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.FakeImageCropper
import com.fab.wab.merchant.feature.team.domain.MemberField
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberEditContract
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract
import com.fab.wab.merchant.feature.team.presentation.controller.vm.MemberEditDependencies
import com.fab.wab.merchant.feature.team.presentation.controller.vm.MemberEditViewModel
import com.fab.wab.merchant.feature.team.presentation.controller.vm.TeamDependencies
import com.fab.wab.merchant.feature.team.presentation.controller.vm.TeamViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** MER-065: team per branch — owner filter, branch required for new members, move with the conflict flow. */
@OptIn(ExperimentalCoroutinesApi::class)
class TeamBranchesViewModelTest {
    private val team = FakeTeam()
    private val affected = FakeAffected()
    private val branches = listOf("b1", "b2", "b3").map {
        Branch(
            it, BranchName(it, it), it == "b1", if (it == "b3") BranchStatus.CLOSED else BranchStatus.ACTIVE,
            null, null, null, null, null, null, null, emptyList(),
        )
    }
    private val scope = MutableStateFlow(BranchScope(MemberScope.AllBranches, branches, null))
    private val owner = SessionState.SignedIn(MemberProfile("owner", "s1", "Huda", MemberRole.OWNER))

    private fun TestScope.memberVm(id: String?) = MemberEditViewModel(
        id,
        MemberEditDependencies(
            team, FakeLocations(), FakeFilePicker(), FakeImageCropper(null), UploadFileUseCase(FakeUploads()), NoOpAnalyticsTracker,
            { "failed" }, scope, affected, { "Staff moved" },
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun ownerFiltersTheTeamByBranch() = runTest(UnconfinedTestDispatcher()) {
        val selected = mutableListOf<String?>()
        val vm = TeamViewModel(
            TeamDependencies(team, affected, flowOf(owner), NoOpAnalyticsTracker, { "x" }, { "failed" }, scope, { selected += it }),
            testScope = backgroundScope,
        ).also { v -> backgroundScope.launch { v.state.collect { } } }
        assertTrue(vm.state.first { !it.loading }.branchScope.showsSwitcher)
        assertNull(team.memberQueries.last())
        vm.onEvent(TeamContract.UiAction.OnBranchSelect("b2"))
        assertEquals(listOf<String?>("b2"), selected)
        scope.value = scope.value.copy(selected = "b2")
        vm.state.first { it.branchScope.filter == "b2" && !it.loading }
        assertEquals("b2", team.memberQueries.last())
    }

    @Test
    fun newMemberNeedsAnOpenBranchAndDefaultsToTheChosenOne() = runTest(UnconfinedTestDispatcher()) {
        val vm = memberVm(null)
        val state = vm.state.first { !it.loading }
        assertEquals(listOf("b1", "b2"), state.branches.map { it.id }, "closed branches are not offered")
        assertNull(state.draft.branchId)
        vm.onEvent(MemberEditContract.UiAction.OnFirstName("Rana"))
        vm.onEvent(MemberEditContract.UiAction.OnLastName("Ali"))
        vm.onEvent(MemberEditContract.UiAction.OnNumber("791234567"))
        vm.onEvent(MemberEditContract.UiAction.OnSave)
        assertTrue(MemberField.BRANCH in vm.state.value.visibleErrors)
        vm.onEvent(MemberEditContract.UiAction.OnBranch(1))
        vm.onEvent(MemberEditContract.UiAction.OnSave)
        assertEquals("b2", team.created.single().branchId)
        scope.value = scope.value.copy(selected = "b2")
        assertEquals("b2", memberVm(null).state.first { !it.loading }.draft.branchId)
    }

    @Test
    fun movingAMemberWithUpcomingBookingsCancelsThemThenMovesAgain() = runTest(UnconfinedTestDispatcher()) {
        team.list = team.list.map { if (it.id == "m1") it.copy(branchId = "b1") else it }
        team.updateResults.addLast(scheduleConflict("k1"))
        val vm = memberVm("m1")
        vm.state.first { !it.loading }
        vm.onEvent(MemberEditContract.UiAction.OnBranch(1))
        vm.onEvent(MemberEditContract.UiAction.OnSave)
        assertEquals(listOf("k1"), vm.state.value.moveConflict)
        vm.onEvent(MemberEditContract.UiAction.OnConflictCancelBookings)
        assertEquals(listOf("k1"), affected.cancelled.single().first)
        assertEquals(AffectedReasons.STAFF_UNAVAILABLE, affected.cancelled.single().second)
        assertEquals(listOf("b2", "b2"), team.updated.map { it.second.branchId })
        assertNull(vm.state.value.moveConflict)
    }
}
