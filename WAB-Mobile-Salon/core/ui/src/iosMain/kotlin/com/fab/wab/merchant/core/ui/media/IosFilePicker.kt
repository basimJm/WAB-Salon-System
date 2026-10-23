package com.fab.wab.merchant.core.ui.media

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
import platform.PhotosUI.PHPickerViewControllerDelegateProtocol
import platform.UIKit.UIApplication
import platform.UIKit.UIDocumentPickerDelegateProtocol
import platform.UIKit.UIDocumentPickerViewController
import platform.UIKit.UIImage
import platform.UIKit.UIViewController
import platform.UniformTypeIdentifiers.UTType
import platform.UniformTypeIdentifiers.UTTypeImage
import platform.UniformTypeIdentifiers.UTTypeMovie
import platform.UniformTypeIdentifiers.UTTypePDF
import platform.darwin.NSObject

/** `UIDocumentPickerViewController` (PDF + images) and `PHPickerViewController` (photos + videos) over the key window. */
@OptIn(ExperimentalForeignApi::class)
class IosFilePicker : FilePicker {

    override suspend fun pickDocuments(maxCount: Int): List<PickedFile> {
        val root = rootController() ?: return emptyList()
        val answer = CompletableDeferred<List<NSURL>>()
        val delegate = DocumentDelegate(answer)
        val picker = UIDocumentPickerViewController(forOpeningContentTypes = listOf(UTTypePDF, UTTypeImage), asCopy = true).apply {
            allowsMultipleSelection = maxCount > 1
            this.delegate = delegate
        }
        root.presentViewController(picker, animated = true, completion = null)
        return answer.await().take(maxCount).mapNotNull(::readFile)
    }

    override suspend fun pickMedia(maxCount: Int, includeVideo: Boolean): List<PickedFile> {
        val root = rootController() ?: return emptyList()
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
        root.presentViewController(picker, animated = true, completion = null)
        val results = answer.await()
        picker.dismissViewControllerAnimated(true, completion = null)
        return results.take(maxCount).mapNotNull { loadResult(it) }
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

    private fun rootController(): UIViewController? = UIApplication.sharedApplication.keyWindow?.rootViewController

    private companion object {
        const val IMAGE_PREFIX = "image/"
        const val MILLIS_PER_SECOND = 1000.0
    }
}

private class DocumentDelegate(private val answer: CompletableDeferred<List<NSURL>>) : NSObject(), UIDocumentPickerDelegateProtocol {
    override fun documentPicker(controller: UIDocumentPickerViewController, didPickDocumentsAtURLs: List<*>) {
        answer.complete(didPickDocumentsAtURLs.filterIsInstance<NSURL>())
    }

    override fun documentPickerWasCancelled(controller: UIDocumentPickerViewController) {
        answer.complete(emptyList())
    }
}

private class MediaDelegate(private val answer: CompletableDeferred<List<PHPickerResult>>) :
    NSObject(), PHPickerViewControllerDelegateProtocol {
    override fun picker(picker: PHPickerViewController, didFinishPicking: List<*>) {
        answer.complete(didFinishPicking.filterIsInstance<PHPickerResult>())
    }
}

/** Crops in pixel space after normalizing the orientation, then encodes like the pickers. */
class IosImageCropper : ImageCropper {
    override suspend fun crop(bytes: ByteArray, region: CropRegion): PickedImage? =
        IosImageCodec.cropAndEncode(bytes, region, FilePickerDefaults.MAX_IMAGE_DIMENSION_PX)
}
