package com.fab.wab.customer.feature.salons.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.catalog.CatalogRepository
import com.fab.wab.customer.core.domain.catalog.CatalogService
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.domain.usecase.LoadFilterServicesUseCase
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllServicesContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllServicesViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private class CatalogFake : CatalogRepository {
    val calls = mutableListOf<Pair<Gender?, Int>>()
    val types = mutableListOf<BusinessType?>()
    var perPage = 10
    var result: AppResult<List<CatalogService>>? = null
    override suspend fun services(gender: Gender?, businessType: BusinessType?, page: Int, pageSize: Int): AppResult<List<CatalogService>> {
        calls += gender to page
        types += businessType
        return result ?: AppResult.Success(List(perPage) { CatalogService("s$page-$it", "Service $it", "d", null) })
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class AllServicesViewModelTest {

    private val catalog = CatalogFake()
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(type: BusinessType? = BusinessType.SALON): AllServicesViewModel {
        val vm = AllServicesViewModel(
            LoadFilterServicesUseCase(catalog), NoOpAnalyticsTracker, { "error" }, backgroundScope, type,
        )
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun loadsTheCatalogWithoutGenderPagesAndOpensSalonsForAService() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        assertEquals(listOf<Pair<Gender?, Int>>(null to 1), catalog.calls, "no gender filter in discovery (§5.22)")
        assertTrue(vm.state.value.hasMore)
        catalog.perPage = 2
        vm.onEvent(UiAction.OnLoadMore)
        assertEquals(12, vm.state.value.services.size)
        assertFalse(vm.state.value.hasMore)
        vm.onEvent(UiAction.OnServiceClick("s1-3"))
        assertEquals(SideEffect.OpenSalons("s1-3", "Service 3", BusinessType.SALON), effects.last())
        assertEquals(listOf<BusinessType?>(BusinessType.SALON, BusinessType.SALON), catalog.types)
    }

    @Test
    fun clinicServicesLoadTheClinicCatalogAndOpenClinics() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(BusinessType.CLINIC)
        assertEquals(listOf<BusinessType?>(BusinessType.CLINIC), catalog.types)
        vm.onEvent(UiAction.OnServiceClick("s1-0"))
        assertEquals(SideEffect.OpenSalons("s1-0", "Service 0", BusinessType.CLINIC), effects.last())
    }

    @Test
    fun lensAllLoadsEveryTypesCatalog() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(null)
        assertEquals(listOf<BusinessType?>(null), catalog.types)
        vm.onEvent(UiAction.OnServiceClick("s1-0"))
        assertEquals(SideEffect.OpenSalons("s1-0", "Service 0", null), effects.last())
    }

    @Test
    fun emptyAndErrorStates() = runTest(UnconfinedTestDispatcher()) {
        catalog.result = AppResult.Success(emptyList())
        val vm = viewModel()
        assertTrue(vm.state.value.loaded)
        assertTrue(vm.state.value.services.isEmpty())
        catalog.result = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnRetry)
        assertTrue(vm.state.value.offline)
        assertEquals("error", vm.state.value.error)
    }
}
