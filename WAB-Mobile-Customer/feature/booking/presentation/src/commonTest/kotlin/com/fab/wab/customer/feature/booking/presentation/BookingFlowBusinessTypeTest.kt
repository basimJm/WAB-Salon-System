package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** CUS-099 (BUSINESS_DOMAIN §5.19): persons' gender and the bride option per business type and audience. */
@OptIn(ExperimentalCoroutinesApi::class)
class BookingFlowBusinessTypeTest : BookingFlowHarness() {

    private val clinic = salon(Gender.FEMALE).copy(businessType = BusinessType.CLINIC, audience = Audience.BOTH)
    private val bothSalon = salon(Gender.FEMALE).copy(audience = Audience.BOTH)

    private fun BookingFlowViewModel.finishPersonWithAnyStaff() {
        reachStaffStep()
        onEvent(UiAction.OnAnyStaffSelect)
        onEvent(UiAction.OnContinue)
    }

    @Test
    fun clinicTakesAMixedGenderBookingAndSendsEachGender() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = clinic)
        assertTrue(vm.state.value.asksGender)
        assertEquals(Gender.FEMALE, vm.state.value.person.gender, "the main person starts with the customer's gender")
        assertFalse(vm.state.value.showsBride, "never a bride at a clinic")
        vm.onEvent(UiAction.OnBrideChange(true))
        assertFalse(vm.state.value.person.isBride)

        vm.finishPersonWithAnyStaff()
        assertEquals(BookingStep.COMPANIONS, vm.state.value.step)
        vm.onEvent(UiAction.OnAddCompanion)
        assertNull(vm.state.value.person.gender, "a companion's gender is asked")
        vm.onEvent(UiAction.OnNameChange("Omar"))
        vm.onEvent(UiAction.OnContinue)
        assertEquals(BookingStep.PERSON, vm.state.value.step)
        assertTrue(vm.state.value.genderError)
        assertFalse(vm.state.value.nameError)
        vm.onEvent(UiAction.OnGenderChange(Gender.MALE))
        assertFalse(vm.state.value.genderError)
        vm.finishPersonWithAnyStaff()
        vm.onEvent(UiAction.OnJustMe)

        assertEquals(BookingStep.SUMMARY, vm.state.value.step)
        assertEquals(listOf<Gender?>(Gender.FEMALE, Gender.MALE), drafts.sentPersons.last().map { it.gender })
    }

    @Test
    fun bothSalonOffersTheBrideOnlyToAWomanAndDropsItForAMan() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = bothSalon)
        assertTrue(vm.state.value.asksGender)
        assertTrue(vm.state.value.showsBride)
        vm.onEvent(UiAction.OnBrideChange(true))
        assertTrue(vm.state.value.person.isBride)
        vm.onEvent(UiAction.OnGenderChange(Gender.MALE))
        assertFalse(vm.state.value.showsBride)
        assertFalse(vm.state.value.person.isBride, "a man is never a bride")
        vm.onEvent(UiAction.OnBrideChange(true))
        assertFalse(vm.state.value.person.isBride)
    }

    @Test
    fun menOrWomenSalonsLockEveryPersonToTheirGender() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(Gender.MALE)
        assertFalse(vm.state.value.asksGender)
        assertEquals(Gender.MALE, vm.state.value.person.gender, "the salon's gender, not the customer's")
        assertFalse(vm.state.value.showsBride)
        vm.onEvent(UiAction.OnGenderChange(Gender.FEMALE))
        assertEquals(Gender.MALE, vm.state.value.person.gender, "no gender choice at a men's salon")
        vm.finishPersonWithAnyStaff()
        vm.onEvent(UiAction.OnAddCompanion)
        assertEquals(Gender.MALE, vm.state.value.person.gender)
        assertTrue(vm.state.value.canContinuePerson.not(), "only the name is missing")
        vm.onEvent(UiAction.OnNameChange("Ali"))
        assertTrue(vm.state.value.canContinuePerson)
    }
}
