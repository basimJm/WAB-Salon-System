package com.fab.wab.merchant.feature.salon.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.upload.LocalFile
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadKind
import com.fab.wab.merchant.core.domain.upload.UploadProgress
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadSlot
import com.fab.wab.merchant.core.domain.upload.acceptUploads
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.designsystem.components.upload.MediaGridMode
import com.fab.wab.merchant.designsystem.components.upload.MediaPickHandler
import com.fab.wab.merchant.designsystem.components.upload.PHOTO_SOURCES
import com.fab.wab.merchant.designsystem.components.upload.UploadStatus
import com.fab.wab.merchant.feature.salon.domain.GalleryItem
import com.fab.wab.merchant.feature.salon.domain.GalleryRepository
import com.fab.wab.merchant.feature.salon.domain.GalleryType
import com.fab.wab.merchant.feature.salon.domain.gallerySlots
import com.fab.wab.merchant.feature.salon.domain.moved
import com.fab.wab.merchant.feature.salon.presentation.analytics.SalonAnalytics
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.GalleryContract.SideEffect
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.GalleryContract.UiAction
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.GalleryContract.UiState
import com.fab.wab.merchant.feature.salon.presentation.controller.contract.PendingMedia
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

private const val MILLIS_PER_SECOND = 1_000L
private const val PENDING_PREFIX = "pending-"

/** PRD M14: multi-select upload with progress and retry, reorder (saved on Done), select & delete with confirmation. */
class GalleryViewModel(
    private val gallery: GalleryRepository,
    private val picker: FilePicker,
    private val upload: UploadFileUseCase,
    private val analytics: AnalyticsTracker,
    private val errorText: suspend (AppError) -> String = ::appErrorText,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var nextPending = 0
    private val media = MediaPickHandler(picker, scope, { uiState.value.media }) { updateState { copy(media = it) } }

    /** Server order when reorder mode started; restored when saving the new order fails. */
    private var orderBefore = emptyList<GalleryItem>()

    override fun onStart() {
        load()
    }

    override fun handle(event: UiAction) {
        handleGrid(event) || handleDialogs(event)
    }

    private fun handleGrid(event: UiAction): Boolean {
        when (event) {
            UiAction.OnAdd -> add()
            is UiAction.OnMedia -> media.handle(event.action)
            is UiAction.OnItemClick -> click(event.id)
            is UiAction.OnRetryItem -> uiState.value.pending.firstOrNull { it.id == event.id }?.let { scope.launch { send(it) } }
            is UiAction.OnMove -> if (uiState.value.mode == MediaGridMode.Reorder) updateState {
                copy(items = items.moved(event.from, event.to))
            }
            is UiAction.OnMode -> enter(event.mode)
            UiAction.OnDone -> done()
            else -> return false
        }
        return true
    }

    private fun handleDialogs(event: UiAction): Boolean {
        when (event) {
            UiAction.OnDeleteClick -> if (uiState.value.selected.isNotEmpty()) updateState { copy(deleteDialog = true) }
            UiAction.OnDeleteConfirm -> delete()
            UiAction.OnDialogDismiss -> updateState { copy(deleteDialog = false, rejection = null) }
            UiAction.OnCloseViewer -> updateState { copy(viewerIndex = null) }
            UiAction.OnRetry -> load()
            else -> return false
        }
        return true
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = gallery.list()) {
                is AppResult.Success -> updateState { copy(loading = false, items = result.data) }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun click(id: String) {
        val state = uiState.value
        when (state.mode) {
            MediaGridMode.Select -> updateState { copy(selected = if (id in selected) selected - id else selected + id) }
            MediaGridMode.Normal -> state.items.indexOfFirst {
                it.id == id
            }.takeIf { it >= 0 }?.let { index -> updateState { copy(viewerIndex = index) } }
            MediaGridMode.Reorder -> Unit
        }
    }

    private fun enter(mode: MediaGridMode) {
        if (uiState.value.busy) return
        if (mode == MediaGridMode.Reorder) orderBefore = uiState.value.items
        updateState { copy(mode = mode, selected = emptySet()) }
    }

    private fun add() {
        val state = uiState.value
        val (images, videos) = gallerySlots(
            state.items,
            state.pending.count { it.type == GalleryType.IMAGE },
            state.pending.count { it.type == GalleryType.VIDEO },
        )
        media.open(PHOTO_SOURCES, maxCount = images + videos, includeVideo = videos > 0) { files -> accept(files, images, videos) }
    }

    private suspend fun accept(files: List<PickedFile>, images: Int, videos: Int) {
        val picked = files.map { file ->
            LocalFile(PENDING_PREFIX + nextPending++, file.name, file.bytes, file.contentType, file.durationMs)
        }
        val (photos, clips) = picked.partition { it.kind != UploadKind.VIDEO }
        val (okPhotos, refusedPhotos) = acceptUploads(photos, UploadSlot.MEDIA, images)
        val (okClips, refusedClips) = acceptUploads(clips, UploadSlot.MEDIA, videos)
        val refused = refusedPhotos + refusedClips
        val pending = (okPhotos + okClips).map { file ->
            PendingMedia(
                file.id,
                file,
                if (file.kind == UploadKind.VIDEO) GalleryType.VIDEO else GalleryType.IMAGE,
                UploadStatus.Uploading(0f),
            )
        }
        updateState { copy(pending = this.pending + pending, rejection = refused.firstOrNull()) }
        pending.forEach { send(it) }
    }

    private suspend fun send(media: PendingMedia) {
        val purpose = if (media.type == GalleryType.VIDEO) UploadPurpose.GALLERY_VIDEO else UploadPurpose.GALLERY_IMAGE
        upload(media.file, purpose).collect { progress ->
            when (progress) {
                is UploadProgress.Uploading -> mark(media.id, UploadStatus.Uploading(progress.fraction))
                is UploadProgress.Failed -> {
                    mark(media.id, UploadStatus.Failed)
                    emitSideEffect(SideEffect.ShowError(errorText(progress.error)))
                }
                is UploadProgress.Done -> {
                    val seconds = media.file.durationMs?.let { ((it + MILLIS_PER_SECOND - 1) / MILLIS_PER_SECOND).toInt() }
                    when (val added = gallery.add(media.type, progress.upload.key, seconds)) {
                        is AppResult.Success -> {
                            analytics.trackAction(AnalyticsAction(
                                SalonAnalytics.ACTION_GALLERY_ADD,
                                analyticsParams { text(SalonAnalytics.PARAM_TYPE, media.type.name) },
                            ))
                            updateState { copy(items = items + added.data, pending = pending.filterNot { it.id == media.id }) }
                        }
                        is AppResult.Error -> {
                            mark(media.id, UploadStatus.Failed)
                            emitSideEffect(SideEffect.ShowError(errorText(added.appError)))
                        }
                        AppResult.Loading -> Unit
                    }
                }
            }
        }
    }

    private fun mark(id: String, status: UploadStatus) =
        updateState { copy(pending = pending.map { if (it.id == id) PendingMedia(it.id, it.file, it.type, status) else it }) }

    private fun done() {
        val state = uiState.value
        if (state.mode != MediaGridMode.Reorder) {
            updateState { copy(mode = MediaGridMode.Normal, selected = emptySet()) }
            return
        }
        val ids = state.items.map { it.id }
        if (ids == orderBefore.map { it.id }) {
            updateState { copy(mode = MediaGridMode.Normal) }
            return
        }
        scope.launch {
            updateState { copy(busy = true) }
            when (val result = gallery.reorder(ids)) {
                is AppResult.Success -> {
                    analytics.trackAction(AnalyticsAction(SalonAnalytics.ACTION_GALLERY_REORDER))
                    updateState { copy(busy = false, mode = MediaGridMode.Normal, items = result.data) }
                }
                is AppResult.Error -> {
                    val message = errorText(result.appError)
                    updateState { copy(busy = false, mode = MediaGridMode.Normal, items = orderBefore) }
                    emitSideEffect(SideEffect.ShowError(message))
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun delete() {
        val ids = uiState.value.selected
        updateState { copy(deleteDialog = false, busy = true) }
        scope.launch {
            val errors = ids.associateWith { id -> gallery.delete(id) as? AppResult.Error }.filterValues { it != null }
            val failed = errors.keys
            updateState {
                copy(
                    busy = false,
                    items = items.filter { it.id !in ids || it.id in failed },
                    selected = failed,
                    mode = if (failed.isEmpty()) MediaGridMode.Normal else mode,
                )
            }
            analytics.trackAction(AnalyticsAction(
                SalonAnalytics.ACTION_GALLERY_DELETE,
                analyticsParams { number(SalonAnalytics.PARAM_COUNT, (ids.size - failed.size).toLong()) },
            ))
            val firstError = errors.values.firstNotNullOfOrNull { it }
            if (firstError == null) {
                emitSideEffect(SideEffect.Deleted)
            } else {
                emitSideEffect(SideEffect.ShowError(errorText(firstError.appError)))
                load()
            }
        }
    }
}
