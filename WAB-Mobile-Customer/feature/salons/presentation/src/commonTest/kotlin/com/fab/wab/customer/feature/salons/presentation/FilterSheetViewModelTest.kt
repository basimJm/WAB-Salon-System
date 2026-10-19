package com.fab.wab.customer.feature.salons.presentation

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.catalog.CatalogRepository
import com.fab.wab.customer.core.domain.catalog.CatalogService
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.domain.repository.SalonFilterOptionsRepository
import com.fab.wab.customer.feature.salons.domain.usecase.LoadFilterServicesUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.LoadPriceBoundsUseCase
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterSheetContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.toFloatRange
import com.fab.wab.customer.feature.salons.presentation.controller.contract.toPriceRange
import com.fab.wab.customer.feature.salons.presentation.controller.vm.FilterSheetDependencies
import com.fab.wab.customer.feature.salons.presentation.controller.vm.FilterSheetViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class SheetCatalogFake : CatalogRepository {
    val pages = mutableListOf<Int>()
    var perPage = 10
    override suspend fun services(gender: Gender, page: Int, pageSize: Int): AppResult<List<CatalogService>> {
        pages += page
        return AppResult.Success(List(perPage) { CatalogService("s$page-$it", "Service $page-$it", "", null) })
    }
}

private class OptionsFake(var bounds: AppResult<PriceRange?> = AppResult.Success(PriceRange("10", "50"))) : SalonFilterOptionsRepository {
    val calls = mutableListOf<List<String>>()
    override suspend fun priceBounds(gender: Gender, serviceIds: List<String>): AppResult<PriceRange?> {
        calls += serviceIds
        return bounds
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class FilterSheetViewModelTest {

    private val catalog = SheetCatalogFake()
    private val options = OptionsFake()
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(initial: SalonFilters = SalonFilters()): FilterSheetViewModel {
        val deps = FilterSheetDependencies(LoadFilterServicesUseCase(catalog), LoadPriceBoundsUseCase(options), errorText = { "error" })
        val vm = FilterSheetViewModel(initial, Gender.FEMALE, deps, testScope = backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun reflectsActiveFiltersAndLoadsTheFirstServicesPage() = runTest(UnconfinedTestDispatcher()) {
        val initial = SalonFilters(listOf(ServiceRef("x", "Hair")), PriceRange("12", "30"), GeneralFilter.NEAREST, 3)
        val vm = viewModel(initial)
        val state = vm.state.value
        assertEquals(listOf(1), catalog.pages)
        assertEquals(10, state.services.size)
        assertTrue(state.servicesHasMore)
        assertEquals(initial.services, state.selectedServices)
        assertEquals(GeneralFilter.NEAREST, state.general)
        assertEquals(3, state.minRating)
        assertEquals(listOf(listOf("x")), options.calls)
        assertTrue(state.showPrice)
        assertTrue(state.canReset)
    }

    @Test
    fun seeMoreLoadsTheNextPageUntilAShortPage() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        catalog.perPage = 4
        vm.onEvent(UiAction.OnSeeMoreServices)
        assertEquals(listOf(1, 2), catalog.pages)
        assertEquals(14, vm.state.value.services.size)
        assertFalse(vm.state.value.servicesHasMore)
        vm.onEvent(UiAction.OnSeeMoreServices)
        assertEquals(listOf(1, 2), catalog.pages)
    }

    @Test
    fun priceAppearsOnlyWithASelectedServiceAndSingleSelectsToggle() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        assertFalse(vm.state.value.showPrice)
        val hair = ServiceRef("s1-0", "Service 1-0")
        vm.onEvent(UiAction.OnServiceToggle(hair))
        assertTrue(vm.state.value.showPrice)
        assertEquals(10f..50f, vm.state.value.priceSelection)
        vm.onEvent(UiAction.OnServiceToggle(hair))
        assertFalse(vm.state.value.showPrice)
        assertTrue(vm.state.value.selectedServices.isEmpty())

        vm.onEvent(UiAction.OnGeneralSelect(GeneralFilter.RECOMMENDED))
        vm.onEvent(UiAction.OnGeneralSelect(GeneralFilter.NEAREST))
        assertEquals(GeneralFilter.NEAREST, vm.state.value.general)
        vm.onEvent(UiAction.OnGeneralSelect(GeneralFilter.NEAREST))
        assertNull(vm.state.value.general)
        vm.onEvent(UiAction.OnRatingSelect(4))
        vm.onEvent(UiAction.OnRatingSelect(2))
        assertEquals(2, vm.state.value.minRating)
    }

    @Test
    fun resetClearsEverythingAndApplyEmitsTheFilters() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        val hair = ServiceRef("s1-0", "Service 1-0")
        vm.onEvent(UiAction.OnServiceToggle(hair))
        vm.onEvent(UiAction.OnPriceChange(15f..40f))
        vm.onEvent(UiAction.OnRatingSelect(4))
        vm.onEvent(UiAction.OnApply)
        assertEquals(
            SideEffect.Applied(SalonFilters(listOf(hair), PriceRange("15", "40"), null, 4)),
            effects.last(),
        )
        vm.onEvent(UiAction.OnReset)
        assertFalse(vm.state.value.canReset)
        assertFalse(vm.state.value.showPrice)
        vm.onEvent(UiAction.OnApply)
        assertEquals(SideEffect.Applied(SalonFilters()), effects.last())
    }

    @Test
    fun priceBoundsFailureOrNonNumericHideTheSection() = runTest(UnconfinedTestDispatcher()) {
        options.bounds = AppResult.Error(AppError.NetworkError("offline"))
        val vm = viewModel(SalonFilters(services = listOf(ServiceRef("x", "Hair"))))
        assertFalse(vm.state.value.showPrice)
        assertNull(PriceRange("min", "max").toFloatRange())
        assertNull((10f..50f).toPriceRange(PriceRange("10", "50")))
        assertEquals(PriceRange("12", "50"), (12.4f..50f).toPriceRange(PriceRange("10", "50")))
    }
}
