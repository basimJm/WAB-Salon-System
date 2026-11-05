package com.fab.wab.customer.feature.salons.presentation

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.domain.model.SuggestedService
import com.fab.wab.customer.feature.salons.domain.model.SuggestionRow
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterChipId
import com.fab.wab.customer.feature.salons.presentation.controller.contract.QuickChip
import com.fab.wab.customer.feature.salons.presentation.controller.vm.SearchQuickDefaults
import com.fab.wab.customer.feature.salons.presentation.controller.vm.isOn
import com.fab.wab.customer.feature.salons.presentation.controller.vm.toggle
import com.fab.wab.customer.feature.salons.presentation.controller.vm.withService
import com.fab.wab.customer.feature.salons.presentation.controller.vm.without
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

/** CUS-103 (BUSINESS_DOMAIN §5.22): suggestions, recent searches, quick chips and the lens on S04. */
@OptIn(ExperimentalCoroutinesApi::class)
class SearchAssistViewModelTest {

    private val harness = SalonsHarness()

    private fun TestScope.viewModel() = harness.viewModel(this)

    @Test
    fun typedTextShowsGroupedSuggestionsUntilSubmitted() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnTextChange("las"))
        testScheduler.advanceTimeBy(DEBOUNCE + 1)
        testScheduler.runCurrent()
        val rows = vm.state.value.suggestionRows
        assertEquals(SuggestionRow.Header(SuggestionRow.Group.SERVICES), rows.first())
        assertIs<SuggestionRow.Place>(rows.last())
        vm.onEvent(UiAction.OnSearchSubmit)
        assertFalse(vm.state.value.showSuggestions, "a submit shows the results")
        assertEquals(listOf("las"), harness.recent.recent.first(), "the submitted text is kept on the device")
    }

    @Test
    fun aSuggestedServiceBecomesAServiceFilterAndAPlaceOpensIt() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnTextChange("las"))
        vm.onEvent(UiAction.OnSuggestedServiceClick(SuggestedService("sv1", "Laser", BusinessType.CLINIC, 3)))
        assertEquals(listOf(ServiceRef("sv1", "Laser")), vm.state.value.filters.services)
        assertEquals("", vm.state.value.text)
        testScheduler.advanceTimeBy(DEBOUNCE + 1)
        testScheduler.runCurrent()
        assertEquals(listOf(ServiceRef("sv1", "Laser")), harness.search.queries.last().filters.services)
        assertEquals("", harness.search.queries.last().text)
        vm.onEvent(UiAction.OnTextChange("lou"))
        vm.onEvent(UiAction.OnSuggestedPlaceClick("p1"))
        assertEquals(SideEffect.OpenSalon("p1"), harness.effects.last())
        assertEquals(listOf("lou", "Laser"), harness.recent.recent.first())
    }

    @Test
    fun recentSearchesRunAgainAndClear() = runTest(UnconfinedTestDispatcher()) {
        harness.recent.add("Nails")
        val vm = viewModel()
        assertTrue(vm.state.value.showRecent)
        vm.onEvent(UiAction.OnRecentClick("Nails"))
        assertEquals("Nails", vm.state.value.text)
        testScheduler.advanceTimeBy(DEBOUNCE + 1)
        testScheduler.runCurrent()
        assertEquals("Nails", harness.search.queries.last().text)
        vm.onEvent(UiAction.OnRecentClear)
        assertEquals(emptyList(), vm.state.value.recent)
    }

    @Test
    fun aFailedSuggestionRequestShowsNoSuggestions() = runTest(UnconfinedTestDispatcher()) {
        harness.suggestions.result = AppResult.Error(AppError.NetworkError("offline"))
        val vm = viewModel()
        vm.onEvent(UiAction.OnTextChange("x"))
        testScheduler.advanceTimeBy(DEBOUNCE + 1)
        testScheduler.runCurrent()
        assertFalse(vm.state.value.showSuggestions)
    }

    @Test
    fun quickChipsToggleFiltersAndPriceOpensTheSheet() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnQuickChip(QuickChip.TOP_RATED))
        assertEquals(SearchQuickDefaults.TOP_RATED_MIN, harness.search.queries.last().filters.minRating)
        val before = harness.search.queries.size
        vm.onEvent(UiAction.OnQuickChip(QuickChip.OPEN_NOW))
        assertEquals(before + 1, harness.search.queries.size, "open now reloads from the server (CUS-110)")
        assertTrue(harness.search.queries.last().filters.openNow)
        assertEquals(1, harness.search.queries.last().page, "reload starts from page 1")
        vm.onEvent(UiAction.OnQuickChip(QuickChip.OPEN_NOW))
        assertFalse(harness.search.queries.last().filters.openNow, "turning it off drops the filter and reloads")
        vm.onEvent(UiAction.OnQuickChip(QuickChip.PRICE))
        assertIs<SideEffect.OpenFilters>(harness.effects.last())
        vm.onEvent(UiAction.OnLensSelect(BusinessType.TATTOO))
        assertEquals(setOf(BusinessType.TATTOO), harness.search.queries.last().filters.businessTypes)
        assertEquals(BusinessType.TATTOO, vm.state.value.lens)
    }

    @Test
    fun quickChipRulesArePure() {
        val none = SalonFilters()
        assertTrue(QuickChip.NEAREST.isOn(none.toggle(QuickChip.NEAREST)))
        assertEquals(GeneralFilter.NEAREST, none.toggle(QuickChip.NEAREST).general)
        assertEquals(none, none.toggle(QuickChip.NEAREST).toggle(QuickChip.NEAREST))
        assertEquals(none, none.toggle(QuickChip.PRICE), "price is not a toggle")
        assertTrue(QuickChip.PRICE.isOn(none.copy(priceRange = PriceRange("1", "2"))))
        assertFalse(none.toggle(QuickChip.OPEN_NOW).toggle(QuickChip.OPEN_NOW).openNow)
        val chosen = none.copy(gender = Gender.MALE, openNow = true, businessTypes = setOf(BusinessType.SALON, BusinessType.CLINIC))
        assertEquals(null, chosen.without(FilterChipId.Gender).gender)
        assertFalse(chosen.without(FilterChipId.OpenNow).openNow)
        assertEquals(setOf(BusinessType.CLINIC), chosen.without(FilterChipId.Type(BusinessType.SALON)).businessTypes)
        val hair = ServiceRef("s", "Hair")
        assertEquals(listOf(hair), none.withService(hair).withService(hair).services, "a service is added once")
    }
}
