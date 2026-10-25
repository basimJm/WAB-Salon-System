package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.domain.salon.SalonBranch
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private fun branch(id: String, isMain: Boolean = false) = SalonBranch(
    id = id, name = id, isMain = isMain, locationText = "Amman", location = null, phone = null, whatsapp = null,
    isOpenNow = true, todayHours = null, closedReason = null, weeklySchedule = emptyList(), upcomingClosures = emptyList(),
)

/** Salon with two bookable branches: service "a" + staff m1 at the main branch, service "b" + staff m2 at Khalda. */
private val TWO_BRANCHES = salon(Gender.FEMALE).copy(
    branches = listOf(branch("main", isMain = true), branch("khalda")),
    services = listOf(service("a", "10", 30).copy(branchId = "main"), service("b", "5.5", 15).copy(branchId = "khalda")),
    staff = listOf(
        StaffPreview("m1", "Omar", null, StaffStatus.ON_DUTY, branchId = "main"),
        StaffPreview("m2", "Ali", null, StaffStatus.ON_DUTY, branchId = "khalda"),
    ),
)

/** BUSINESS_DOMAIN §5.18: step 0 = choose the branch; every later step uses that branch only. */
@OptIn(ExperimentalCoroutinesApi::class)
class BookingFlowBranchTest : BookingFlowHarness() {

    @Test
    fun severalBranchesStartAtTheBranchStepAndContinueNeedsAChoice() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = TWO_BRANCHES)
        val state = vm.state.value
        assertEquals(BookingStep.BRANCH, state.step)
        assertEquals(BookingStep.entries, state.steps)
        assertFalse(state.canContinueBranch)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.BRANCH, vm.state.value.step)

        vm.onEvent(UiAction.OnBranchSelect("khalda"))
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        assertEquals(1, vm.state.value.stepIndex)
        assertEquals(listOf("b"), vm.state.value.salon?.services?.map { it.id })
        assertEquals(listOf("m2"), vm.state.value.salon?.staff?.map { it.id })
    }

    @Test
    fun singleBranchSkipsTheStepAndBackExits() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = TWO_BRANCHES.copy(branches = TWO_BRANCHES.branches.take(1)))
        val state = vm.state.value
        assertEquals(BookingStep.PERSON, state.step)
        assertEquals("main", state.branchId)
        assertFalse(BookingStep.BRANCH in state.steps)
        assertEquals(0, state.stepIndex)
        vm.onEvent(UiAction.OnBack)
        assertEquals(SideEffect.Exit, effects.last())
    }

    @Test
    fun preselectedBranchSkipsTheStepButBackStillOffersTheChoice() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = TWO_BRANCHES, branchId = "khalda")
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        assertEquals("khalda", vm.state.value.branchId)
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.BRANCH, vm.state.value.step)
        vm.onEvent(UiAction.OnBack)
        assertEquals(SideEffect.Exit, effects.last())
    }

    @Test
    fun slotsAndDraftAreRequestedForTheChosenBranch() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = TWO_BRANCHES, branchId = "main")
        vm.reachStaffStep()
        assertEquals(listOf<String?>("main"), availability.branches)
        vm.onEvent(UiAction.OnStaffSelect("m1"))
        vm.onEvent(UiAction.OnContinue)
        vm.onEvent(UiAction.OnJustMe)
        assertEquals(BookingStep.SUMMARY, vm.state.value.step)
        assertEquals(listOf<String?>("main"), drafts.branches)
        assertEquals("main", vm.state.value.selectedBranch?.id)
    }

    @Test
    fun changingTheBranchClearsServicesSlotsAndStaff() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = TWO_BRANCHES, branchId = "main")
        vm.reachStaffStep()
        assertTrue(vm.state.value.person.serviceIds.isNotEmpty())
        repeat(BACK_TO_BRANCH_STEP) { vm.onEvent(UiAction.OnBack) }
        assertEquals(BookingStep.BRANCH, vm.state.value.step)
        vm.onEvent(UiAction.OnBranchSelect("main"))
        assertEquals(listOf("a"), vm.state.value.person.serviceIds)
        vm.onEvent(UiAction.OnBranchSelect("khalda"))
        val person = vm.state.value.person
        assertTrue(person.serviceIds.isEmpty())
        assertEquals(null, person.start)
        assertEquals(null, person.staff)
        assertEquals("Sara", person.name)
        vm.onEvent(UiAction.OnBranchSelect("unknown"))
        assertEquals("khalda", vm.state.value.branchId)
        assertEquals(null, vm.state.value.selectedDate)
    }

    private companion object {
        /** Staff → slot → services → person → branch. */
        const val BACK_TO_BRANCH_STEP = 4
    }
}
