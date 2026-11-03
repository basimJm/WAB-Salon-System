package com.fab.wab.customer.feature.salons.presentation

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SalonsDialog
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterChipId
import com.fab.wab.customer.feature.salons.presentation.controller.vm.toFilters
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class AllSalonsViewModelTest {

    private val harness = SalonsHarness()
    private val search get() = harness.search
    private val permissions get() = harness.permissions
    private val effects get() = harness.effects

    private fun TestScope.viewModel(entry: AllSalonsEntry = AllSalonsEntry()) = harness.viewModel(this, entry)

    @Test
    fun entryPresetsBecomeFilters() {
        assertEquals(GeneralFilter.RECOMMENDED, AllSalonsEntry(filter = SalonListFilter.RECOMMENDED).toFilters().general)
        assertEquals(listOf(ServiceRef("s1", "Hair")), AllSalonsEntry(serviceId = "s1", serviceName = "Hair").toFilters().services)
        assertEquals(setOf(BusinessType.TATTOO), AllSalonsEntry(businessType = BusinessType.TATTOO).toFilters().businessTypes)
        assertTrue(AllSalonsEntry().toFilters().isEmpty)
    }

    @Test
    fun loadsTheFirstPageWithoutGenderAndPresetsThenPages() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AllSalonsEntry(filter = SalonListFilter.RECOMMENDED))
        val first = search.queries.single()
        assertNull(first.filters.gender, "discovery lists every audience unless a gender is chosen (§5.22)")
        assertEquals(GeneralFilter.RECOMMENDED, first.filters.general)
        assertEquals(1, first.page)
        assertTrue(vm.state.value.hasMore)
        vm.onEvent(UiAction.OnLoadMore)
        assertEquals(2, search.queries.last().page)
        assertEquals(20, vm.state.value.salons.size)
    }

    @Test
    fun entryTypeIsTheLensAndTheSheetChoosesTypesWithAReload() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AllSalonsEntry(filter = SalonListFilter.RECOMMENDED, businessType = BusinessType.CLINIC))
        assertEquals(BusinessType.CLINIC, vm.state.value.lens)
        assertEquals(setOf(BusinessType.CLINIC), search.queries.single().filters.businessTypes)
        vm.onEvent(UiAction.OnFiltersApplied(vm.state.value.filters.copy(businessTypes = setOf(BusinessType.CLINIC, BusinessType.TATTOO))))
        assertEquals(setOf(BusinessType.CLINIC, BusinessType.TATTOO), search.queries.last().filters.businessTypes)
        assertNull(vm.state.value.lens, "several types: no single lens chip")
        assertEquals(GeneralFilter.RECOMMENDED, search.queries.last().filters.general, "other filters stay")
        vm.onEvent(UiAction.OnLoadMore)
        assertEquals(2, search.queries.last().filters.businessTypes.size, "paging keeps the types")
        vm.onEvent(UiAction.OnChipRemove(FilterChipId.Type(BusinessType.TATTOO)))
        assertEquals(setOf(BusinessType.CLINIC), search.queries.last().filters.businessTypes, "removing one type keeps the other")
        vm.onEvent(UiAction.OnLensSelect(null))
        assertTrue(search.queries.last().filters.businessTypes.isEmpty(), "the lens All lists every business")
        assertEquals(GeneralFilter.RECOMMENDED, search.queries.last().filters.general, "only the type is dropped")
    }

    @Test
    fun searchIsDebouncedNotPerKeystroke() = runTest {
        val vm = viewModel()
        runCurrent()
        vm.onEvent(UiAction.OnTextChange("g"))
        vm.onEvent(UiAction.OnTextChange("gl"))
        vm.onEvent(UiAction.OnTextChange("glo"))
        advanceTimeBy(DEBOUNCE / 2)
        runCurrent()
        assertEquals(1, search.queries.size)
        assertTrue(harness.suggestions.calls.isEmpty())
        advanceTimeBy(DEBOUNCE + 1)
        runCurrent()
        assertEquals(2, search.queries.size)
        assertEquals("glo", search.queries.last().text)
        assertEquals("glo", harness.suggestions.calls.single().first, "one suggestions request per settled text")
    }

    @Test
    fun removingAChipReloadsWithoutIt() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AllSalonsEntry(serviceId = "s1", serviceName = "Hair", filter = SalonListFilter.RECOMMENDED))
        vm.onEvent(UiAction.OnChipRemove(FilterChipId.Service("s1")))
        assertTrue(search.queries.last().filters.services.isEmpty())
        vm.onEvent(UiAction.OnChipRemove(FilterChipId.General))
        assertNull(search.queries.last().filters.general)
        assertEquals(3, search.queries.size)
    }

    @Test
    fun nearestWithoutLocationAsksAndDropsTheFilterWhenRefused() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AllSalonsEntry(filter = SalonListFilter.NEAREST))
        assertTrue(search.queries.isEmpty())
        assertEquals(SalonsDialog.LocationExplanation, vm.state.value.dialog)
        vm.onEvent(UiAction.OnDialogConfirm)
        assertNull(vm.state.value.filters.general)
        assertEquals(SideEffect.NearestDropped, effects.last())
        assertNull(search.queries.single().location)
    }

    @Test
    fun nearestWithLocationGrantedSendsCoordinates() = runTest(UnconfinedTestDispatcher()) {
        permissions.status = PermissionStatus.GRANTED
        viewModel(AllSalonsEntry(filter = SalonListFilter.NEAREST))
        assertEquals(AMMAN, search.queries.single().location)
    }

    @Test
    fun emptyAndErrorStates() = runTest(UnconfinedTestDispatcher()) {
        search.result = AppResult.Success(emptyList())
        val vm = viewModel()
        assertTrue(vm.state.value.loaded)
        assertTrue(vm.state.value.salons.isEmpty())
        search.result = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnRetry)
        assertTrue(vm.state.value.offline)
        assertEquals("error", vm.state.value.error)
    }
}
