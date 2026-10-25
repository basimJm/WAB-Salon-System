package com.fab.wab.merchant.core.ui.media

/** A file picked on the device (document, photo or video); images are already compressed on the device. */
class PickedFile(
    val name: String,
    val bytes: ByteArray,
    val contentType: String,
    val durationMs: Long? = null,
)

/** Platform document / media picker (MER-016); every call returns an empty list when the user cancels. */
interface FilePicker {
    /** Images or PDFs (license and registration documents), at most [maxCount]. */
    suspend fun pickDocuments(maxCount: Int): List<PickedFile>

    /** Photos, and videos when [includeVideo], from the library; at most [maxCount]. */
    suspend fun pickMedia(maxCount: Int, includeVideo: Boolean): List<PickedFile>
}

/** Normalized crop rectangle: fractions (0..1) of the source width and height. */
data class CropRegion(val left: Float, val top: Float, val width: Float, val height: Float) {
    companion object {
        val FULL = CropRegion(0f, 0f, 1f, 1f)
    }
}

/** Crops an image to a [CropRegion] and re-encodes it as JPEG within [FilePickerDefaults.MAX_IMAGE_DIMENSION_PX]. */
interface ImageCropper {
    suspend fun crop(bytes: ByteArray, region: CropRegion): PickedImage?
}

object FilePickerDefaults {
    /** Salon photos keep more detail than avatars (`ImagePickerDefaults`). */
    const val MAX_IMAGE_DIMENSION_PX = 2048
    const val PDF_CONTENT_TYPE = "application/pdf"
    const val VIDEO_CONTENT_TYPE = "video/mp4"
    const val FALLBACK_NAME = "file"
}

class FakeFilePicker(
    var documents: List<PickedFile> = emptyList(),
    var media: List<PickedFile> = emptyList(),
) : FilePicker {
    val requests = mutableListOf<String>()

    override suspend fun pickDocuments(maxCount: Int): List<PickedFile> {
        requests += "documents:$maxCount"
        return documents.take(maxCount)
    }

    override suspend fun pickMedia(maxCount: Int, includeVideo: Boolean): List<PickedFile> {
        requests += "media:$maxCount:$includeVideo"
        return media.filter { includeVideo || !it.contentType.startsWith(VIDEO_PREFIX) }.take(maxCount)
    }

    private companion object {
        const val VIDEO_PREFIX = "video/"
    }
}

class FakeImageCropper(var result: PickedImage? = null) : ImageCropper {
    val regions = mutableListOf<CropRegion>()

    override suspend fun crop(bytes: ByteArray, region: CropRegion): PickedImage? {
        regions += region
        return result
    }
}
