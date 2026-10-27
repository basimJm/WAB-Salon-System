package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.MediaSource
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.CatalogRequest
import com.fab.wab.merchant.feature.salon.domain.CatalogRequestLimits
import com.fab.wab.merchant.feature.salon.domain.CatalogRequestStatus
import com.fab.wab.merchant.feature.salon.domain.CatalogRequestsRepository
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestsContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.CatalogRequestsContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.CatalogRequestsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class FakeRequests : CatalogRequestsRepository {
    var fail = false
    val sent = mutableListOf<Triple<String, String, String?>>()
    override suspend fun list(page: Int): AppResult<List<CatalogRequest>> =
        AppResult.Success(listOf(
            CatalogRequest("r1", "Henna", "Bridal henna", CatalogRequestStatus.REJECTED, "Already in catalog", "2026-10-20T10:00:00Z"),
        ))
    override suspend fun create(name: String, description: String, imageKey: String?): AppResult<CatalogRequest> {
        if (fail) return AppResult.Error(AppError.NetworkError("offline"))
        sent += Triple(name, description, imageKey)
        return AppResult.Success(CatalogRequest("r2", name, description, CatalogRequestStatus.PENDING, null, "2026-10-24T10:00:00Z"))
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class CatalogRequestsViewModelTest {

    private val requests = FakeRequests()
    private val picker = FakeFilePicker(media = listOf(PickedFile("a.jpg", byteArrayOf(1), "image/jpeg")))

    private fun TestScope.viewModel() = CatalogRequestsViewModel(
        requests,
        picker,
        UploadFileUseCase(FakeUploads()),
        NoOpAnalyticsTracker,
        { "failed" },
        backgroundScope,
    )
        .also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun formNeedsNameAndDescriptionThenSendsWithThePicture() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        assertEquals("Already in catalog", viewModel.state.first { !it.loading }.requests.single().adminNote)
        viewModel.onEvent(UiAction.OnNew)
        viewModel.onEvent(UiAction.OnName("Keratin"))
        assertFalse(viewModel.state.first().form?.valid == true)
        viewModel.onEvent(UiAction.OnDescription("x".repeat(CatalogRequestLimits.DESCRIPTION_MAX + 5)))
        assertEquals(CatalogRequestLimits.DESCRIPTION_MAX, viewModel.state.first().form?.description?.length)
        viewModel.onEvent(UiAction.OnDescription("Smoothing treatment"))
        viewModel.onEvent(UiAction.OnPickImage)
        viewModel.onEvent(UiAction.OnMedia(MediaPickAction.SourceChosen(MediaSource.LIBRARY)))
        assertEquals(UploadStatus.Uploaded, viewModel.state.first().form?.image?.status)
        viewModel.onEvent(UiAction.OnSend)
        assertEquals(Triple("Keratin", "Smoothing treatment", "CATALOG_IMAGE-key"), requests.sent.single())
        val state = viewModel.state.first()
        assertNull(state.form)
        assertEquals(listOf("r2", "r1"), state.requests.map { it.id })
        assertEquals(SideEffect.Sent, effects.last())
    }

    @Test
    fun sendFailureKeepsTheForm() = runTest(UnconfinedTestDispatcher()) {
        requests.fail = true
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnNew)
        viewModel.onEvent(UiAction.OnName("Keratin"))
        viewModel.onEvent(UiAction.OnDescription("Smoothing"))
        viewModel.onEvent(UiAction.OnSend)
        assertTrue(viewModel.state.first().form != null)
    }
}
