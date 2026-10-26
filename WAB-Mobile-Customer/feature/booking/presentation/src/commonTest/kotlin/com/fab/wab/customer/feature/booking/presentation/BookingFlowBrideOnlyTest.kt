package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.servicesOfferedTo
import com.fab.wab.customer.feature.booking.domain.model.withBride
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

/** CUS-093 (SRV-170, PRD S16 step 1): bride-only (VIP) services are offered only to a person marked as bride. */
@OptIn(ExperimentalCoroutinesApi::class)
class BookingFlowBrideOnlyTest : BookingFlowHarness() {

    private val vip = service("vip", "40", 60).copy(brideOnly = true)
    private val withVip = salon(Gender.FEMALE).let { it.copy(services = it.services + vip) }

    @Test
    fun theOfferedListHidesVipServicesFromNonBrides() {
        val services = withVip.services
        assertEquals(listOf("a", "b"), servicesOfferedTo(services, isBride = false).map { it.id })
        assertEquals(listOf("a", "b", "vip"), servicesOfferedTo(services, isBride = true).map { it.id })
    }

    @Test
    fun aPersonWhoStopsBeingABrideLosesOnlyTheVipSelection() {
        val bride = DraftPerson(name = "Huda", isBride = true, serviceIds = listOf("a", "vip"))
        val notBride = bride.withBride(false, withVip.services)
        assertEquals(false, notBride.isBride)
        assertEquals(listOf("a"), notBride.serviceIds)
        assertEquals(listOf("a"), notBride.withBride(true, withVip.services).serviceIds, "becoming a bride removes nothing")
    }

    @Test
    fun servicesStepOffersVipOnlyAfterTheBrideToggle() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = withVip)
        vm.onEvent(UiAction.OnContinue)
        assertEquals(listOf("a", "b"), vm.state.value.offeredServices.map { it.id })
        vm.onEvent(UiAction.OnServiceToggle("vip"))
        assertEquals(emptyList(), vm.state.value.person.serviceIds, "a VIP service cannot be picked for a non-bride")

        vm.onEvent(UiAction.OnBack)
        vm.onEvent(UiAction.OnBrideChange(true))
        vm.onEvent(UiAction.OnContinue)
        assertEquals(listOf("a", "b", "vip"), vm.state.value.offeredServices.map { it.id })
        vm.onEvent(UiAction.OnServiceToggle("vip"))
        vm.onEvent(UiAction.OnServiceToggle("a"))
        assertEquals(90, vm.state.value.totals.durationMinutes)

        vm.onEvent(UiAction.OnBack)
        vm.onEvent(UiAction.OnBrideChange(false))
        assertEquals(listOf("a"), vm.state.value.person.serviceIds, "unmarking the bride drops the VIP pick")
        assertEquals(30, vm.state.value.totals.durationMinutes)
    }
}
