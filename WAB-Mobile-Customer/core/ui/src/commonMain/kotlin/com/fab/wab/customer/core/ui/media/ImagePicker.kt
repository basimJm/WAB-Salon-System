package com.fab.wab.customer.core.ui.media

/** Where S21 takes the profile photo from (PRD S21: camera or gallery). */
enum class ImageSource { CAMERA, GALLERY }

/** Device-compressed image bytes ready for a presigned upload (PRD §3.16). */
class PickedImage(val bytes: ByteArray, val contentType: String)

/** Platform picker port: null when the user cancelled or nothing could be read. */
interface ImagePicker {
    suspend fun pick(source: ImageSource): PickedImage?
}

object ImagePickerDefaults {
    const val JPEG_CONTENT_TYPE = "image/jpeg"
    const val MAX_DIMENSION_PX = 1024
    const val JPEG_QUALITY = 85
}

class FakeImagePicker(var result: PickedImage? = null) : ImagePicker {
    val requests = mutableListOf<ImageSource>()
    override suspend fun pick(source: ImageSource): PickedImage? {
        requests += source
        return result
    }
}
