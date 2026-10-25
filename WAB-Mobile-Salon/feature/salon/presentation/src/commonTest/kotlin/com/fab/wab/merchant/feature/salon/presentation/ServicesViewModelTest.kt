package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.ServiceField
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogPickerContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServiceEditContract
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.ServicesContract
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.CatalogPickerViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.ServiceEditDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.ServiceEditViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.ServicesViewModel
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
class ServicesViewModelTest {

    private val services = FakeServices()
    private val salon = FakeSalon(AppResult.Success(salon()))
    private val uploads = FakeUploads()
    private val picker = FakeFilePicker(media = listOf(PickedFile("a.jpg", byteArrayOf(1), "image/jpeg")))

    private fun <T : Any> TestScope.effects(flow: kotlinx.coroutines.flow.Flow<T>) = mutableListOf<T>().also { list ->
        backgroundScope.launch { flow.collect { list += it } }
    }

    private fun TestScope.list() = ServicesViewModel(
        services,
        NoOpAnalyticsTracker,
        { "failed" },
        backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.picker() = CatalogPickerViewModel(
        services,
        salon,
        { "failed" },
        backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.edit(serviceId: String?, catalogId: String?) = ServiceEditViewModel(
        serviceId, catalogId, ServiceEditDependencies(
            services,
            salon,
            picker,
            UploadFileUseCase(uploads),
            NoOpAnalyticsTracker,
            { "failed" },
        ), backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun listSearchToggleWithConfirmationAndLiveUpdates() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = list()
        val effects = effects(viewModel.sideEffect)
        assertEquals(2, viewModel.state.first { !it.loading }.services.size)
        viewModel.onEvent(ServicesContract.UiAction.OnQuery("s2"))
        assertEquals(listOf("s2"), viewModel.state.first().shown.map { it.id })
        viewModel.onEvent(ServicesContract.UiAction.OnToggle("s1", false))
        assertEquals("s1", viewModel.state.first().confirmDeactivate)
        assertTrue(services.toggled.isEmpty())
        viewModel.onEvent(ServicesContract.UiAction.OnConfirmDeactivate)
        assertEquals(listOf("s1" to false), services.toggled)
        assertFalse(viewModel.state.first().services.first { it.id == "s1" }.active)
        assertEquals(ServicesContract.SideEffect.Toggled(false), effects.last())
        viewModel.onEvent(ServicesContract.UiAction.OnToggle("s2", true))
        assertEquals("s2" to true, services.toggled.last())
    }

    @Test
    fun catalogUsesTheSalonGenderPagesAndMarksAdded() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = picker()
        val effects = effects(viewModel.sideEffect)
        val state = viewModel.state.first { !it.loading }
        assertEquals(listOf(SalonGenderType.FEMALE), services.catalogGenders)
        assertTrue(state.womenSalon && state.hasMore)
        assertEquals("s1", state.added["c1"])
        viewModel.onEvent(CatalogPickerContract.UiAction.OnLoadMore)
        assertEquals("x", viewModel.state.first().items.last().id)
        assertFalse(viewModel.state.first().hasMore)
        viewModel.onEvent(CatalogPickerContract.UiAction.OnItemClick("c1"))
        assertEquals(CatalogPickerContract.SideEffect.OpenExisting("s1"), effects.last())
        viewModel.onEvent(CatalogPickerContract.UiAction.OnItemClick("c2"))
        assertEquals(CatalogPickerContract.SideEffect.OpenNew("c2"), effects.last())
    }

    @Test
    fun newServiceValidatesThenCreatesWithUploadedMedia() = runTest(UnconfinedTestDispatcher()) {
        picker().state.first { !it.loading }
        val viewModel = edit(null, "c2")
        val effects = effects(viewModel.sideEffect)
        val state = viewModel.state.first { !it.loading }
        assertTrue(state.isNew && state.womenSalon)
        assertEquals("Catalog c2", state.title)
        viewModel.onEvent(ServiceEditContract.UiAction.OnSave)
        assertEquals(setOf(ServiceField.PRICE, ServiceField.DURATION), viewModel.state.first().visibleErrors)
        viewModel.onEvent(ServiceEditContract.UiAction.OnPrice("15"))
        viewModel.onEvent(ServiceEditContract.UiAction.OnDuration("30"))
        viewModel.onEvent(ServiceEditContract.UiAction.OnBrideOnly(true))
        viewModel.onEvent(ServiceEditContract.UiAction.OnAddMedia)
        assertEquals(UploadStatus.Uploaded, viewModel.state.first().uploads.single().status)
        viewModel.onEvent(ServiceEditContract.UiAction.OnSave)
        val (catalogId, draft) = services.created.single()
        assertEquals("c2", catalogId)
        assertEquals(listOf("SERVICE_MEDIA-key"), draft.mediaKeys)
        assertTrue(draft.brideOnly)
        assertEquals(ServiceEditContract.SideEffect.Saved, effects.last())
    }

    @Test
    fun editDeactivationIsConfirmedAndRemovingMediaKeepsTheCurrentOnes() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = edit("s1", null)
        val loaded = viewModel.state.first { !it.loading }
        assertEquals("12.5", loaded.draft.price)
        assertEquals(listOf("m/s1"), loaded.currentMedia)
        assertFalse(loaded.canSave)
        viewModel.onEvent(ServiceEditContract.UiAction.OnAddMedia)
        viewModel.onEvent(ServiceEditContract.UiAction.OnRemoveMedia(viewModel.state.first().uploads.single().id))
        assertNull(viewModel.state.first().draft.mediaKeys)
        viewModel.onEvent(ServiceEditContract.UiAction.OnActive(false))
        viewModel.onEvent(ServiceEditContract.UiAction.OnSave)
        assertTrue(viewModel.state.first().confirmDeactivate)
        assertTrue(services.updated.isEmpty())
        viewModel.onEvent(ServiceEditContract.UiAction.OnConfirmDeactivate)
        assertFalse(services.updated.single().second.active)
    }

    @Test
    fun unknownServiceShowsAnError() = runTest(UnconfinedTestDispatcher()) {
        assertEquals("failed", edit("missing", null).state.first { !it.loading }.error)
    }

    @Test
    fun ownerServicesFollowTheEditedBranchForListToggleAndSave() = runTest(UnconfinedTestDispatcher()) {
        val branches = listOf("b1", "b2").map {
            Branch(it, BranchName(it, it), it == "b1", BranchStatus.ACTIVE, null, null, null, null, null, null, null, emptyList())
        }
        val scope = MutableStateFlow(BranchScope(MemberScope.AllBranches, branches, null))
        scope.value = scope.value.copy(selected = "b2")
        val viewModel = ServicesViewModel(services, NoOpAnalyticsTracker, { "failed" }, backgroundScope, scope, {})
            .also { vm -> backgroundScope.launch { vm.state.collect { } } }
        viewModel.state.first { !it.loading && it.branchScope.edited == "b2" }
        viewModel.onEvent(ServicesContract.UiAction.OnToggle("s2", true))
        assertEquals(listOf<String?>("b2", "b2"), services.branchIds.takeLast(2))
        val form = ServiceEditViewModel(
            "s1", null,
            ServiceEditDependencies(services, salon, picker, UploadFileUseCase(uploads), NoOpAnalyticsTracker, { "failed" }, scope),
            backgroundScope,
        ).also { vm -> backgroundScope.launch { vm.state.collect { } } }
        form.state.first { !it.loading }
        form.onEvent(ServiceEditContract.UiAction.OnPrice("30"))
        form.onEvent(ServiceEditContract.UiAction.OnSave)
        assertEquals("b2", services.branchIds.last())
    }
}
