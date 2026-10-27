package com.fab.wab.merchant.core.ui.media

import com.fab.wab.merchant.core.ui.external.IosUiKit
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.CompletableDeferred
import platform.AVFoundation.AVURLAsset
import platform.CoreMedia.CMTimeGetSeconds
import platform.Foundation.NSData
import platform.Foundation.NSURL
import platform.Foundation.dataWithContentsOfURL
import platform.PhotosUI.PHPickerConfiguration
import platform.PhotosUI.PHPickerFilter
import platform.PhotosUI.PHPickerResult
import platform.PhotosUI.PHPickerViewController
import platform.UIKit.UIApplicationOpenSettingsURLString
import platform.UIKit.UIDocumentPickerViewController
import platform.UIKit.UIImage
import platform.UIKit.UIImagePickerController
import platform.UIKit.UIImagePickerControllerSourceType
import platform.UniformTypeIdentifiers.UTType
import platform.UniformTypeIdentifiers.UTTypeImage
import platform.UniformTypeIdentifiers.UTTypeMovie
import platform.UniformTypeIdentifiers.UTTypePDF
import platform.darwin.NSObject

/**
 * `PHPickerViewController` (photos + videos, no permission), `UIDocumentPickerViewController` (PDF + images) and the
 * camera (`UIImagePickerController`, after the camera authorization) presented from the top-most controller.
 *
 * UIKit keeps picker delegates WEAKLY: the delegate is held in [activeDelegate] until the answer arrives. A local
 * delegate is not kept alive across the suspension by Kotlin/Native, so it could be collected while the picker is on
 * screen — the picker then never reports back and the upload button "does nothing".
 */
@OptIn(ExperimentalForeignApi::class)
class IosFilePicker : FilePicker {
    private var activeDelegate: NSObject? = null
    private val camera = IosCameraAccess()

    override val isCameraAvailable: Boolean
        get() = UIImagePickerController.isSourceTypeAvailable(CAMERA_SOURCE)

    override suspend fun pick(request: PickRequest): PickResult = when (request.source) {
        MediaSource.CAMERA -> capture()
        MediaSource.LIBRARY -> pickMedia(request.maxCount, request.includeVideo)
        MediaSource.FILES -> pickDocuments(request.maxCount)
    }

    override fun openCameraSettings() = IosUiKit.openNow(UIApplicationOpenSettingsURLString)

    private suspend fun capture(): PickResult = when {
        !isCameraAvailable -> PickResult.CameraUnavailable
        !camera.ensureAccess() -> PickResult.CameraBlocked
        else -> takePhoto()
    }

    private suspend fun takePhoto(): PickResult {
        val presenter = IosUiKit.topViewController() ?: return PickResult.Cancelled
        val answer = CompletableDeferred<UIImage?>()
        val delegate = CameraDelegate(answer)
        val picker = UIImagePickerController().apply {
            sourceType = CAMERA_SOURCE
            this.delegate = delegate
        }
        val image = awaitWith(delegate) {
            presenter.presentViewController(picker, animated = true, completion = null)
            answer.await()
        }
        picker.dismissViewControllerAnimated(true, completion = null)
        val encoded = image?.let { IosImageCodec.encode(it, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX) } ?: return PickResult.Cancelled
        return PickResult.Picked(listOf(PickedFile(FilePickerDefaults.CAMERA_FILE_NAME, encoded.bytes, encoded.contentType)))
    }

    private suspend fun pickDocuments(maxCount: Int): PickResult {
        val presenter = IosUiKit.topViewController() ?: return PickResult.Cancelled
        val answer = CompletableDeferred<List<NSURL>>()
        val delegate = DocumentDelegate(answer)
        val picker = UIDocumentPickerViewController(forOpeningContentTypes = listOf(UTTypePDF, UTTypeImage), asCopy = true).apply {
            allowsMultipleSelection = maxCount > 1
            this.delegate = delegate
        }
        val urls = awaitWith(delegate) {
            presenter.presentViewController(picker, animated = true, completion = null)
            answer.await()
        }
        return urls.take(maxCount).mapNotNull(::readFile).toResult()
    }

    private suspend fun pickMedia(maxCount: Int, includeVideo: Boolean): PickResult {
        val presenter = IosUiKit.topViewController() ?: return PickResult.Cancelled
        val configuration = PHPickerConfiguration().apply {
            selectionLimit = maxCount.toLong()
            filter = if (includeVideo) {
                PHPickerFilter.anyFilterMatchingSubfilters(listOf(PHPickerFilter.imagesFilter, PHPickerFilter.videosFilter))
            } else {
                PHPickerFilter.imagesFilter
            }
        }
        val answer = CompletableDeferred<List<PHPickerResult>>()
        val delegate = MediaDelegate(answer)
        val picker = PHPickerViewController(configuration).apply { this.delegate = delegate }
        val results = awaitWith(delegate) {
            presenter.presentViewController(picker, animated = true, completion = null)
            answer.await()
        }
        picker.dismissViewControllerAnimated(true, completion = null)
        return results.take(maxCount).mapNotNull { loadResult(it) }.toResult()
    }

    /** Keeps [delegate] strongly referenced for as long as the picker is on screen. */
    private suspend fun <T> awaitWith(delegate: NSObject, block: suspend () -> T): T {
        activeDelegate = delegate
        return try {
            block()
        } finally {
            if (activeDelegate === delegate) activeDelegate = null
        }
    }

    private suspend fun loadResult(result: PHPickerResult): PickedFile? {
        val provider = result.itemProvider
        val isVideo = provider.hasItemConformingToTypeIdentifier(UTTypeMovie.identifier)
        val type = if (isVideo) UTTypeMovie.identifier else UTTypeImage.identifier
        val answer = CompletableDeferred<PickedFile?>()
        provider.loadFileRepresentationForTypeIdentifier(type) { url, _ ->
            // The temporary file is deleted when this block returns: read it here.
            answer.complete(url?.let { if (isVideo) readVideo(it) else readImage(it) })
        }
        return answer.await()
    }

    private fun readFile(url: NSURL): PickedFile? {
        val data = NSData.dataWithContentsOfURL(url) ?: return null
        val name = url.lastPathComponent ?: FilePickerDefaults.FALLBACK_NAME
        val type = url.pathExtension?.let { UTType.typeWithFilenameExtension(it)?.preferredMIMEType }
        return if (type?.startsWith(IMAGE_PREFIX) == true) {
            readImage(url)
        } else {
            PickedFile(name, data.toByteArray(), type ?: FilePickerDefaults.PDF_CONTENT_TYPE)
        }
    }

    private fun readImage(url: NSURL): PickedFile? {
        val data = NSData.dataWithContentsOfURL(url) ?: return null
        val image = UIImage.imageWithData(data) ?: return null
        val picked = IosImageCodec.encode(image, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX) ?: return null
        return PickedFile(url.lastPathComponent ?: FilePickerDefaults.FALLBACK_NAME, picked.bytes, picked.contentType)
    }

    private fun readVideo(url: NSURL): PickedFile? {
        val data = NSData.dataWithContentsOfURL(url) ?: return null
        val seconds = CMTimeGetSeconds(AVURLAsset(uRL = url, options = null).duration)
        val type = url.pathExtension?.let {
            UTType.typeWithFilenameExtension(it)?.preferredMIMEType
        } ?: FilePickerDefaults.VIDEO_CONTENT_TYPE
        return PickedFile(
            name = url.lastPathComponent ?: FilePickerDefaults.FALLBACK_NAME,
            bytes = data.toByteArray(),
            contentType = type,
            durationMs = (seconds * MILLIS_PER_SECOND).toLong(),
        )
    }

    private fun List<PickedFile>.toResult(): PickResult = if (isEmpty()) PickResult.Cancelled else PickResult.Picked(this)

    private companion object {
        const val IMAGE_PREFIX = "image/"
        const val MILLIS_PER_SECOND = 1000.0
        val CAMERA_SOURCE = UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypeCamera
    }
}

/** Crops in pixel space after normalizing the orientation, then encodes like the pickers. */
class IosImageCropper : ImageCropper {
    override suspend fun crop(bytes: ByteArray, region: CropRegion): PickedImage? =
        IosImageCodec.cropAndEncode(bytes, region, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX)
}
