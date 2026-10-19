package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode
import com.fab.wab.customer.core.domain.booking.PaymentMethod
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.domain.model.DraftMoney
import com.fab.wab.customer.feature.booking.domain.model.DraftPolicy
import com.fab.wab.customer.feature.booking.domain.repository.BookingDraftRepository
import com.fab.wab.customer.feature.booking.domain.usecase.CreateBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.usecase.DeleteBookingDraftUseCase
import com.fab.wab.customer.feature.booking.domain.model.AvailabilitySlot
import com.fab.wab.customer.feature.booking.domain.model.DayAvailability
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.NoSlotsReason
import com.fab.wab.customer.feature.booking.domain.repository.AvailabilityRepository
import com.fab.wab.customer.feature.booking.domain.usecase.LoadAvailabilityUseCase
import kotlinx.datetime.LocalDate
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.SalonService
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.domain.salon.StaffPreview
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowDependencies
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class BookingFlowStaffAndSummaryTest : BookingFlowHarness() {

    @Test
    fun staffStepAllowsOnlyEligibleMembersOrAnyThenCompanions() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.reachStaffStep()
        assertEquals(BookingStep.STAFF, vm.state.value.step)
        assertEquals(setOf("m1"), vm.state.value.eligibleStaffIds)
        vm.onEvent(UiAction.OnStaffSelect("m2"))
        assertFalse(vm.state.value.canContinueStaff)
        vm.onEvent(UiAction.OnStaffSelect("m1"))
        assertEquals(StaffChoice.Specific("m1", "Omar"), vm.state.value.person.staff)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        vm.onEvent(UiAction.OnJustMe)
        assertEquals(BookingStep.SUMMARY, vm.state.value.step)
    }

    @Test
    fun companionRepeatsTheStepsOverlapIsBlockedAndRemovalWorks() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.reachStaffStep()
        vm.onEvent(UiAction.OnStaffSelect("m1"))
        vm.onEvent(UiAction.OnContinue)
        vm.onEvent(UiAction.OnAddCompanion)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        assertEquals(1, vm.state.value.currentPerson)
        vm.onEvent(UiAction.OnNameChange("Lina"))
        vm.reachStaffStep()
        assertEquals(2, availability.calls.size)
        assertEquals(1, availability.calls.last().second.size)
        vm.onEvent(UiAction.OnStaffSelect("m1"))
        assertTrue(vm.state.value.staffOverlapError)
        assertFalse(vm.state.value.canContinueStaff)
        vm.onEvent(UiAction.OnAnyStaffSelect)
        assertFalse(vm.state.value.staffOverlapError)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        assertEquals(0, vm.state.value.currentPerson)
        assertEquals(1, vm.state.value.companionsCount)
        vm.onEvent(UiAction.OnRemovePerson(0))
        assertEquals(2, vm.state.value.persons.size)
        vm.onEvent(UiAction.OnRemovePerson(1))
        assertEquals(1, vm.state.value.persons.size)
    }

    @Test
    fun companionLimitAndUnfinishedCompanionIsDroppedOnBack() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.reachStaffStep()
        vm.onEvent(UiAction.OnAnyStaffSelect)
        vm.onEvent(UiAction.OnContinue)
        repeat(5) {
            vm.onEvent(UiAction.OnAddCompanion)
            vm.onEvent(UiAction.OnNameChange("C$it"))
            vm.reachStaffStep()
            vm.onEvent(UiAction.OnAnyStaffSelect)
            vm.onEvent(UiAction.OnContinue)
        }
        assertEquals(5, vm.state.value.companionsCount)
        assertFalse(vm.state.value.canAddCompanion)
        vm.onEvent(UiAction.OnAddCompanion)
        assertEquals(6, vm.state.value.persons.size)
        vm.onEvent(UiAction.OnRemovePerson(5))
        vm.onEvent(UiAction.OnAddCompanion)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        assertEquals(5, vm.state.value.persons.size)
    }

    @Test
    fun summaryCreatesTheDraftWithPaymentFallbackSwitchesMethodsAndReleasesOnBack() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.reachStaffStep()
        vm.onEvent(UiAction.OnAnyStaffSelect)
        vm.onEvent(UiAction.OnContinue)
        vm.onEvent(UiAction.OnJustMe)
        assertEquals(BookingStep.SUMMARY, vm.state.value.step)
        assertEquals(listOf(PaymentMethod.PAY_ON_ARRIVAL, PaymentMethod.DEPOSIT), drafts.created)
        assertEquals(PaymentMethod.DEPOSIT, vm.state.value.draft?.paymentMethod)
        assertTrue(vm.state.value.canConfirm)
        vm.onEvent(UiAction.OnPaymentMethodSelect(PaymentMethod.FULL_ONLINE))
        assertEquals(listOf("d2"), drafts.deleted)
        assertEquals(PaymentMethod.FULL_ONLINE, vm.state.value.draft?.paymentMethod)
        vm.onEvent(UiAction.OnPaymentMethodSelect(PaymentMethod.PAY_ON_ARRIVAL))
        assertEquals(3, drafts.created.size)
        vm.onEvent(UiAction.OnConfirm)
        assertEquals(SideEffect.OpenVerification("d3"), effects.last())
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        assertEquals(listOf("d2", "d3"), drafts.deleted)
    }
}
