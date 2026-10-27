package com.fab.wab.merchant.core.ui.media

/** A file picked on the device (document, photo or video); images are already compressed on the device. */
class PickedFile(
    val name: String,
    val bytes: ByteArray,
    val contentType: String,
    val durationMs: Long? = null,
)

/** Where a file comes from (PRD M04 "image from camera/gallery or PDF", M13/M14/M17 camera or gallery). */
enum class MediaSource {
    /** One new photo from the camera. */
    CAMERA,

    /** Photos (and videos when asked) from the photo library: Android Photo Picker, iOS PHPicker. */
    LIBRARY,

    /** Documents (PDF + images) from the files app. */
    FILES,
}

/** What to pick: [maxCount] files from [source]; videos only from the library when [includeVideo]. */
data class PickRequest(val source: MediaSource, val maxCount: Int, val includeVideo: Boolean = false)

/** The answer of a pick; every outcome the screen has to explain is explicit (nothing hangs, nothing throws). */
sealed interface PickResult {
    data class Picked(val files: List<PickedFile>) : PickResult

    /** The user closed the picker, or nothing could be read. */
    data object Cancelled : PickResult

    /** No camera on this device (iOS simulator, some tablets) or no camera app to take the photo. */
    data object CameraUnavailable : PickResult

    /** Camera access was refused; only the system settings can change it (iOS). */
    data object CameraBlocked : PickResult
}

/** Platform document / media picker (MER-016, MER-076); one request at a time. */
interface FilePicker {
    /** False on the iOS simulator and on devices without a camera: the screen shows the option as unavailable. */
    val isCameraAvailable: Boolean

    suspend fun pick(request: PickRequest): PickResult

    /** The system settings page where camera access is granted again (after [PickResult.CameraBlocked]). */
    fun openCameraSettings()
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
    /** Salon photos keep detail; avatars are cropped and re-encoded within the same bound. */
    const val MAX_IMAGE_DIMENSION_PX = 2048
    const val PDF_CONTENT_TYPE = "application/pdf"
    const val VIDEO_CONTENT_TYPE = "video/mp4"
    const val FALLBACK_NAME = "file"
    const val CAMERA_FILE_NAME = "camera.jpg"
}

/** Test double: [documents] answer FILES, [media] answer LIBRARY, [camera] answers CAMERA; [result] overrides all. */
class FakeFilePicker(
    var documents: List<PickedFile> = emptyList(),
    var media: List<PickedFile> = emptyList(),
    var camera: PickedFile? = null,
    override var isCameraAvailable: Boolean = true,
    var result: PickResult? = null,
) : FilePicker {
    val requests = mutableListOf<String>()
    var settingsOpened = 0
        private set

    override suspend fun pick(request: PickRequest): PickResult {
        requests += "${request.source.name.lowercase()}:${request.maxCount}:${request.includeVideo}"
        result?.let { return it }
        val files = when (request.source) {
            MediaSource.FILES -> documents
            MediaSource.LIBRARY -> media.filter { request.includeVideo || !it.contentType.startsWith(VIDEO_PREFIX) }
            MediaSource.CAMERA -> if (!isCameraAvailable) return PickResult.CameraUnavailable else listOfNotNull(camera)
        }.take(request.maxCount)
        return if (files.isEmpty()) PickResult.Cancelled else PickResult.Picked(files)
    }

    override fun openCameraSettings() {
        settingsOpened += 1
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
