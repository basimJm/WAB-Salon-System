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
class BookingFlowViewModelTest : BookingFlowHarness() {

    @Test
    fun prefillsTheAccountNameAndGatesTheBrideToggleByGender() = runTest(UnconfinedTestDispatcher()) {
        val women = viewModel(Gender.FEMALE)
        assertEquals("Sara", women.state.value.person.name)
        assertTrue(women.state.value.isWomenSalon)
        women.onEvent(UiAction.OnBrideChange(true))
        assertTrue(women.state.value.person.isBride)

        val men = viewModel(Gender.MALE)
        men.onEvent(UiAction.OnBrideChange(true))
        assertFalse(men.state.value.person.isBride)
    }

    @Test
    fun nameRequiredThenServicesWithRunningTotalsAndBackKeepsSelections() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnNameChange(" "))
        vm.onEvent(UiAction.OnContinue)
        assertTrue(vm.state.value.nameError)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        vm.onEvent(UiAction.OnNameChange("Lina"))
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.SERVICES, vm.state.value.step)
        assertFalse(vm.state.value.canContinueServices)
        vm.onEvent(UiAction.OnServiceToggle("a"))
        vm.onEvent(UiAction.OnServiceToggle("b"))
        assertEquals(15_500, vm.state.value.totals.priceFils)
        assertEquals(45, vm.state.value.totals.durationMinutes)
        vm.onEvent(UiAction.OnServiceToggle("b"))
        assertEquals(listOf("a"), vm.state.value.person.serviceIds)
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        assertEquals("Lina", vm.state.value.person.name)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(listOf("a"), vm.state.value.person.serviceIds)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.SLOT, vm.state.value.step)
    }

    @Test
    fun backFromTheFirstStepExits() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnBack)
        assertEquals(SideEffect.Exit, effects.last())
    }

    @Test
    fun slotStepBuildsTheCalendarLoadsSlotsAndRejectsFullOnes() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnContinue)
        vm.onEvent(UiAction.OnServiceToggle("a"))
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.SLOT, vm.state.value.step)
        assertEquals(91, vm.state.value.calendar.size)
        assertFalse(vm.state.value.canContinueSlot)
        vm.onEvent(UiAction.OnDateSelect(LocalDate.parse("2026-10-20")))
        assertEquals("2026-10-20", availability.calls.single().first)
        assertEquals(2, vm.state.value.availability?.slots?.size)
        vm.onEvent(UiAction.OnSlotSelect("2026-10-20T07:15:00Z"))
        assertFalse(vm.state.value.canContinueSlot)
        vm.onEvent(UiAction.OnSlotSelect("2026-10-20T07:00:00Z"))
        assertTrue(vm.state.value.canContinueSlot)
        assertEquals("2026-10-20", vm.state.value.person.date)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.STAFF, vm.state.value.step)
        vm.onEvent(UiAction.OnBack)
        assertEquals(BookingStep.SLOT, vm.state.value.step)
        assertEquals(LocalDate.parse("2026-10-20"), vm.state.value.selectedDate)
        assertEquals(1, availability.calls.size)
    }
}
