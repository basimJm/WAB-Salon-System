package com.fab.wab.merchant.feature.branches.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.branch.BranchField
import com.fab.wab.merchant.designsystem.components.map.MapPickerAction
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchEditContract.SideEffect
import com.fab.wab.merchant.feature.branches.presentation.controller.contract.BranchEditContract.UiAction
import com.fab.wab.merchant.feature.branches.presentation.controller.vm.BranchEditDependencies
import com.fab.wab.merchant.feature.branches.presentation.controller.vm.BranchEditViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** MER-062: create / edit a branch with names AR + EN, map pin, city / area and phones. */
@OptIn(ExperimentalCoroutinesApi::class)
class BranchEditViewModelTest {
    private val repository = FakeBranches()

    private fun TestScope.viewModel(id: String?) = BranchEditViewModel(
        id,
        BranchEditDependencies(repository, FakeLocations(), fakeMap(), NoOpAnalyticsTracker, { "failed" }),
        backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.effectsOf(vm: BranchEditViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { vm.sideEffect.collect { list += it } } }

    @Test
    fun newBranchValidatesThenCreatesWithThePickedLocation() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(null)
        val effects = effectsOf(vm)
        vm.onEvent(UiAction.OnSave)
        assertTrue(BranchField.NAME_AR in vm.state.value.visibleErrors)
        assertTrue(repository.calls.isEmpty())
        vm.onEvent(UiAction.OnNameAr("شارع مكة"))
        vm.onEvent(UiAction.OnNameEn("Mecca Street"))
        vm.onEvent(UiAction.OnOpenMap)
        assertEquals("Mecca St", vm.state.value.map?.address, "a new pin resolves its address")
        vm.onEvent(UiAction.OnMap(MapPickerAction.Confirm))
        vm.onEvent(UiAction.OnCity(0))
        vm.onEvent(UiAction.OnArea(0))
        vm.onEvent(UiAction.OnPhone("+962 79 123 4567"))
        vm.onEvent(UiAction.OnSave)
        assertEquals(listOf("create"), repository.calls)
        assertEquals("Mecca St", repository.saved?.locationText)
        assertEquals("a-c1", repository.saved?.areaId)
        assertEquals(listOf<SideEffect>(SideEffect.Saved(created = true)), effects)
    }

    @Test
    fun editLoadsTheBranchAndSavesOnlyWhenChanged() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel("b")
        val state = vm.state.first { !it.loading }
        assertEquals("Branch b", state.form.nameEn)
        assertFalse(state.canSave)
        vm.onEvent(UiAction.OnCity(1))
        assertEquals(null, vm.state.value.form.areaId, "a new city clears the area")
        vm.onEvent(UiAction.OnArea(0))
        vm.onEvent(UiAction.OnSave)
        assertEquals(listOf("update:b"), repository.calls)
    }

    @Test
    fun unknownBranchAndServerErrorsAreShown() = runTest(UnconfinedTestDispatcher()) {
        assertEquals("failed", viewModel("missing").state.first { !it.loading }.error)
        repository.failure = AppError.ServerError(ErrorCode.BRANCH_LIMIT_REACHED, 422, null)
        val vm = viewModel("b")
        val effects = effectsOf(vm)
        vm.state.first { !it.loading }
        vm.onEvent(UiAction.OnNameEn("Renamed"))
        vm.onEvent(UiAction.OnSave)
        assertEquals(listOf<SideEffect>(SideEffect.ShowError("failed")), effects)
        assertFalse(vm.state.value.saving)
    }
}
