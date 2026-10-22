package com.fab.wab.merchant.feature.salon.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadLimits
import com.fab.wab.merchant.core.domain.upload.UploadRejection
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.upload.MediaGridMode
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.GalleryItem
import com.fab.wab.merchant.feature.salon.domain.GalleryRepository
import com.fab.wab.merchant.feature.salon.domain.GalleryType
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.GalleryContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.GalleryContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.GalleryViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private fun item(id: String, type: GalleryType = GalleryType.IMAGE, order: Int = 0) = GalleryItem(id, type, "https://cdn/$id", null, null, order)

private class FakeGallery : GalleryRepository {
    var items = listOf(item("a"), item("b", order = 1), item("c", GalleryType.VIDEO, 2))
    var addFails = false
    var reorderFails = false
    val deleteFails = mutableSetOf<String>()
    val added = mutableListOf<Triple<GalleryType, String, Int?>>()
    var order: List<String>? = null
    override suspend fun list(): AppResult<List<GalleryItem>> = AppResult.Success(items)
    override suspend fun add(type: GalleryType, key: String, durationSec: Int?): AppResult<GalleryItem> {
        added += Triple(type, key, durationSec)
        return if (addFails) AppResult.Error(AppError.NetworkError("x")) else AppResult.Success(item("n${added.size}", type))
    }
    override suspend fun reorder(ids: List<String>): AppResult<List<GalleryItem>> {
        order = ids
        return if (reorderFails) AppResult.Error(AppError.NetworkError("x")) else AppResult.Success(ids.map { id -> items.first { it.id == id } })
    }
    override suspend fun delete(id: String): AppResult<Unit> =
        if (id in deleteFails) AppResult.Error(AppError.NetworkError("x")) else AppResult.Success(Unit).also { items = items.filterNot { it.id == id } }
}

@OptIn(ExperimentalCoroutinesApi::class)
class GalleryViewModelTest {

    private val gallery = FakeGallery()
    private val uploads = FakeUploads()
    private val picker = FakeFilePicker(
        media = listOf(
            PickedFile("p.jpg", byteArrayOf(1), "image/jpeg"),
            PickedFile("v.mp4", byteArrayOf(2), "video/mp4", durationMs = 12_400),
            PickedFile("long.mp4", byteArrayOf(3), "video/mp4", durationMs = UploadLimits.VIDEO_MAX_DURATION_MS + 1),
        ),
    )

    private fun TestScope.viewModel() = GalleryViewModel(gallery, picker, UploadFileUseCase(uploads), NoOpAnalyticsTracker, { "failed" }, backgroundScope)
        .also { vm -> backgroundScope.launch { vm.state.collect { } } }

    private fun TestScope.effectsOf(viewModel: GalleryViewModel) =
        mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }

    @Test
    fun addUploadsAcceptedFilesAndReportsTheRefusedOne() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnAdd)
        val state = viewModel.state.first()
        assertEquals(listOf(GalleryType.IMAGE to "GALLERY_IMAGE-key", GalleryType.VIDEO to "GALLERY_VIDEO-key"), gallery.added.map { it.first to it.second })
        assertEquals(13, gallery.added.last().third)
        assertEquals(5, state.items.size)
        assertTrue(state.pending.isEmpty())
        assertEquals(UploadRejection.TOO_LONG, state.rejection)
        assertTrue(picker.requests.single().endsWith(":true"))
    }

    @Test
    fun failedAddStaysAsRetryCell() = runTest(UnconfinedTestDispatcher()) {
        gallery.addFails = true
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnAdd)
        val pending = viewModel.state.first().pending
        assertEquals(listOf(UploadStatus.Failed, UploadStatus.Failed), pending.map { it.status })
        assertEquals(SideEffect.ShowError("failed"), effects.last())
        gallery.addFails = false
        viewModel.onEvent(UiAction.OnRetryItem(pending.first().id))
        assertEquals(1, viewModel.state.first().pending.size)
    }

    @Test
    fun reorderSavesOnDoneAndRestoresOnFailure() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnMove(2, 0))
        assertEquals(listOf("a", "b", "c"), viewModel.state.first().items.map { it.id })
        viewModel.onEvent(UiAction.OnMode(MediaGridMode.Reorder))
        viewModel.onEvent(UiAction.OnMove(2, 0))
        viewModel.onEvent(UiAction.OnDone)
        assertEquals(listOf("c", "a", "b"), gallery.order)
        assertEquals(MediaGridMode.Normal, viewModel.state.first().mode)
        gallery.reorderFails = true
        viewModel.onEvent(UiAction.OnMode(MediaGridMode.Reorder))
        viewModel.onEvent(UiAction.OnMove(0, 2))
        viewModel.onEvent(UiAction.OnDone)
        assertEquals(listOf("c", "a", "b"), viewModel.state.first().items.map { it.id })
    }

    @Test
    fun selectDeleteConfirmAndPartialFailure() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = effectsOf(viewModel)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnMode(MediaGridMode.Select))
        viewModel.onEvent(UiAction.OnItemClick("a"))
        viewModel.onEvent(UiAction.OnItemClick("b"))
        viewModel.onEvent(UiAction.OnItemClick("b"))
        viewModel.onEvent(UiAction.OnDeleteClick)
        assertTrue(viewModel.state.first().deleteDialog)
        viewModel.onEvent(UiAction.OnDeleteConfirm)
        assertEquals(listOf("b", "c"), viewModel.state.first().items.map { it.id })
        assertEquals(SideEffect.Deleted, effects.last())
        gallery.deleteFails += "c"
        viewModel.onEvent(UiAction.OnMode(MediaGridMode.Select))
        viewModel.onEvent(UiAction.OnItemClick("b"))
        viewModel.onEvent(UiAction.OnItemClick("c"))
        viewModel.onEvent(UiAction.OnDeleteConfirm)
        assertEquals(SideEffect.ShowError("failed"), effects.last())
        assertEquals(listOf("c"), viewModel.state.first().items.map { it.id })
    }

    @Test
    fun normalTapOpensTheViewer() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnItemClick("b"))
        assertEquals(1, viewModel.state.first().viewerIndex)
        viewModel.onEvent(UiAction.OnCloseViewer)
        assertNull(viewModel.state.first().viewerIndex)
    }
}
