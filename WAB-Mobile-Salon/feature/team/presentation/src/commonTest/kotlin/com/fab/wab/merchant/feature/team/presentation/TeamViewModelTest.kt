package com.fab.wab.merchant.feature.team.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.AffectedReasons
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.MediaSource
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.core.ui.media.FakeImageCropper
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.core.ui.media.PickedImage
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.feature.team.domain.MemberField
import com.fab.wab.merchant.feature.team.presentation.controller.contract.MemberEditContract
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract.SideEffect
import com.fab.wab.merchant.feature.team.presentation.controller.contract.TeamContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.vm.MemberEditDependencies
import com.fab.wab.merchant.feature.team.presentation.controller.vm.MemberEditViewModel
import com.fab.wab.merchant.feature.team.presentation.controller.vm.TeamDependencies
import com.fab.wab.merchant.feature.team.presentation.controller.vm.TeamViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class TeamViewModelTest {

    private val team = FakeTeam()
    private val affected = FakeAffected()

    private fun session(
        role: MemberRole,
        vararg keys: String,
    ) = SessionState.SignedIn(MemberProfile("me", "s1", "Huda", role), keys.toSet())

    private fun <T : Any> TestScope.collect(flow: Flow<T>) = mutableListOf<T>().also { list ->
        backgroundScope.launch { flow.collect { list += it } }
    }

    private fun TestScope.teamVm(state: SessionState = session(MemberRole.OWNER)) = TeamViewModel(
        TeamDependencies(team, affected, flowOf(state), NoOpAnalyticsTracker, { "Staff left" }, { "failed" }),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.memberVm(id: String?) = MemberEditViewModel(
        id,
        MemberEditDependencies(
            team, FakeLocations(), FakeFilePicker(media = listOf(PickedFile("p.jpg", byteArrayOf(1), "image/jpeg"))),
            FakeImageCropper(PickedImage(
                byteArrayOf(2),
                "image/jpeg",
            )), UploadFileUseCase(FakeUploads()), NoOpAnalyticsTracker, { "failed" },
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun ownerOpensMembersButNotTheOwnerRowAndStaffManagersOpenProviders() = runTest(UnconfinedTestDispatcher()) {
        val owner = teamVm()
        val effects = collect(owner.sideEffect)
        assertTrue(owner.state.first { !it.loading }.access.canAdd)
        owner.onEvent(UiAction.OnMemberClick("owner"))
        owner.onEvent(UiAction.OnMemberClick("m1"))
        owner.onEvent(UiAction.OnAdd)
        assertEquals(listOf(SideEffect.OpenStaff("owner"), SideEffect.OpenMember("m1"), SideEffect.AddMember), effects)
        val staff = teamVm(session(MemberRole.MANAGER, "STAFF_MANAGE"))
        val staffEffects = collect(staff.sideEffect)
        assertFalse(staff.state.first { !it.loading }.access.canAdd)
        staff.onEvent(UiAction.OnMemberClick("m1"))
        staff.onEvent(UiAction.OnMemberClick("m2"))
        staff.onEvent(UiAction.OnAdd)
        assertEquals(listOf<SideEffect>(SideEffect.OpenStaff("m1")), staffEffects)
    }

    @Test
    fun deactivationIsConfirmedAndConflictsCancelThenRetry() = runTest(UnconfinedTestDispatcher()) {
        team.deactivateResults += scheduleConflict("b1", "b2")
        val viewModel = teamVm()
        val effects = collect(viewModel.sideEffect)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnActiveChange("owner", false))
        assertNull(viewModel.state.first().confirmDeactivate)
        viewModel.onEvent(UiAction.OnActiveChange("m1", false))
        assertEquals("m1", viewModel.state.first().confirmDeactivate)
        viewModel.onEvent(UiAction.OnConfirmDeactivate)
        assertEquals(listOf("b1", "b2"), viewModel.state.first().conflict?.bookingIds)
        viewModel.onEvent(UiAction.OnConflictCancelBookings)
        assertEquals(Triple(listOf("b1", "b2"), AffectedReasons.STAFF_UNAVAILABLE, "Staff left"), affected.cancelled.single())
        assertEquals(listOf("deactivate:m1", "deactivate:m1"), team.calls)
        assertFalse(viewModel.state.first().members.first { it.id == "m1" }.active)
        assertEquals(SideEffect.ActiveChanged(false), effects.last())
    }

    @Test
    fun reassignOpensTheFirstBookingAndReactivateNeedsNoConfirmation() = runTest(UnconfinedTestDispatcher()) {
        team.deactivateResults += scheduleConflict("b7")
        val viewModel = teamVm()
        val effects = collect(viewModel.sideEffect)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnActiveChange("m1", false))
        viewModel.onEvent(UiAction.OnConfirmDeactivate)
        viewModel.onEvent(UiAction.OnConflictReassign)
        assertEquals(SideEffect.OpenBooking("b7"), effects.last())
        viewModel.onEvent(UiAction.OnActiveChange("m2", true))
        assertEquals("reactivate:m2", team.calls.last())
    }

    @Test
    fun newMemberNeedsAValidPhoneAndSavesWithThePhoto() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = memberVm(null)
        val effects = collect(viewModel.sideEffect)
        val state = viewModel.state.first { !it.loading }
        assertEquals("JO", state.draft.countryCode)
        viewModel.onEvent(MemberEditContract.UiAction.OnFirstName("Rana"))
        viewModel.onEvent(MemberEditContract.UiAction.OnLastName("Ali"))
        viewModel.onEvent(MemberEditContract.UiAction.OnNumber("0791"))
        viewModel.onEvent(MemberEditContract.UiAction.OnSave)
        assertEquals(setOf(MemberField.PHONE), viewModel.state.first().visibleErrors)
        viewModel.onEvent(MemberEditContract.UiAction.OnNumber("079 123 4567"))
        viewModel.onEvent(MemberEditContract.UiAction.OnRole(MemberRole.OWNER))
        assertEquals(MemberRole.EMPLOYEE, viewModel.state.first().draft.role)
        viewModel.onEvent(MemberEditContract.UiAction.OnRole(MemberRole.MANAGER))
        viewModel.onEvent(MemberEditContract.UiAction.OnPickPhoto)
        viewModel.onEvent(MemberEditContract.UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.LIBRARY)))
        viewModel.onEvent(MemberEditContract.UiAction.OnCropConfirm(CropRegion.FULL))
        viewModel.onEvent(MemberEditContract.UiAction.OnSave)
        val draft = team.created.single()
        assertEquals("791234567", draft.number)
        assertEquals("MEMBER_PHOTO-key", draft.photoKey)
        assertEquals(MemberRole.MANAGER, draft.role)
        assertEquals(MemberEditContract.SideEffect.Saved(added = true), effects.last())
    }

    @Test
    fun existingMemberKeepsThePhoneAndOnlySavesChanges() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = memberVm("m1")
        val loaded = viewModel.state.first { !it.loading }
        assertEquals("+962791234567", loaded.phone)
        assertFalse(loaded.canSave)
        viewModel.onEvent(MemberEditContract.UiAction.OnNumber("0790000000"))
        assertFalse(viewModel.state.first().canSave)
        viewModel.onEvent(MemberEditContract.UiAction.OnFirstName("Rana"))
        viewModel.onEvent(MemberEditContract.UiAction.OnSave)
        assertEquals("m1" to "Rana", team.updated.single().let { it.first to it.second.firstName })
    }

    @Test
    fun loadingAnUnknownMemberShowsTheError() = runTest(UnconfinedTestDispatcher()) {
        assertEquals("failed", memberVm("missing").state.first { !it.loading }.error)
    }
}
