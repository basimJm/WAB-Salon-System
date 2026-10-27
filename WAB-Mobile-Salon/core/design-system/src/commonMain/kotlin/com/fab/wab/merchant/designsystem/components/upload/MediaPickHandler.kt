package com.fab.wab.merchant.designsystem.components.upload

import androidx.compose.runtime.Immutable
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.core.ui.media.MediaSource
import com.fab.wab.merchant.core.ui.media.PickRequest
import com.fab.wab.merchant.core.ui.media.PickResult
import com.fab.wab.merchant.core.ui.media.PickedFile
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** A message the source chooser has to show after a camera attempt. */
enum class MediaNotice {
    /** Camera access refused: offer the system settings. */
    CAMERA_BLOCKED,

    /** No camera, or no camera app, on this device. */
    CAMERA_UNAVAILABLE,
}

/**
 * Source chooser state (PRD M04 "camera / gallery / PDF", M13/M14/M17 "camera or gallery"): [sources] non-empty
 * while the sheet is open; [cameraAvailable] false shows the camera row disabled with its reason.
 */
@Immutable
data class MediaPickUi(
    val sources: List<MediaSource> = emptyList(),
    val cameraAvailable: Boolean = true,
    val notice: MediaNotice? = null,
) {
    val isChoosing: Boolean get() = sources.isNotEmpty()
}

sealed interface MediaPickAction {
    data class SourceChosen(val source: MediaSource) : MediaPickAction
    data object Dismiss : MediaPickAction
    data object OpenSettings : MediaPickAction
    data object DismissNotice : MediaPickAction
}

/** Sources of a photo slot (cover, profile, avatar, service / catalog image, gallery). */
val PHOTO_SOURCES: List<MediaSource> = listOf(MediaSource.CAMERA, MediaSource.LIBRARY)

/** Sources of a document slot (license / proof documents: photo, library image or PDF). */
val DOCUMENT_SOURCES: List<MediaSource> = listOf(MediaSource.CAMERA, MediaSource.LIBRARY, MediaSource.FILES)

/**
 * The upload reducer every picking screen shares: [open] shows the chooser, the chosen source runs the platform
 * picker, picked files go to the screen's `onPicked`, camera refusals become a [MediaNotice]. The owning view model
 * keeps the [MediaPickUi] in its state, like [com.fab.wab.merchant.designsystem.components.map.MapPickerHandler].
 */
class MediaPickHandler(
    private val picker: FilePicker,
    private val scope: CoroutineScope,
    private val read: () -> MediaPickUi,
    private val write: (MediaPickUi) -> Unit,
) {
    private class Pending(val maxCount: Int, val includeVideo: Boolean, val onPicked: suspend (List<PickedFile>) -> Unit)

    private var pending: Pending? = null

    /** Opens the chooser for up to [maxCount] files (nothing when no room is left). */
    fun open(
        sources: List<MediaSource>,
        maxCount: Int,
        includeVideo: Boolean = false,
        onPicked: suspend (List<PickedFile>) -> Unit,
    ) {
        if (maxCount <= 0 || sources.isEmpty()) return
        pending = Pending(maxCount, includeVideo, onPicked)
        write(read().copy(sources = sources, cameraAvailable = picker.isCameraAvailable, notice = null))
    }

    fun handle(action: MediaPickAction) {
        when (action) {
            is MediaPickAction.SourceChosen -> choose(action.source)
            MediaPickAction.Dismiss -> {
                pending = null
                write(read().copy(sources = emptyList()))
            }
            MediaPickAction.OpenSettings -> {
                picker.openCameraSettings()
                write(read().copy(notice = null))
            }
            MediaPickAction.DismissNotice -> write(read().copy(notice = null))
        }
    }

    private fun choose(source: MediaSource) {
        val request = pending ?: return
        if (source == MediaSource.CAMERA && !read().cameraAvailable) return
        pending = null
        write(read().copy(sources = emptyList()))
        scope.launch {
            val count = if (source == MediaSource.CAMERA) 1 else request.maxCount
            val video = request.includeVideo && source == MediaSource.LIBRARY
            when (val result = picker.pick(PickRequest(source, count, video))) {
                is PickResult.Picked -> request.onPicked(result.files.take(request.maxCount))
                PickResult.CameraBlocked -> write(read().copy(notice = MediaNotice.CAMERA_BLOCKED))
                PickResult.CameraUnavailable -> write(read().copy(notice = MediaNotice.CAMERA_UNAVAILABLE))
                PickResult.Cancelled -> Unit
            }
        }
    }
}
