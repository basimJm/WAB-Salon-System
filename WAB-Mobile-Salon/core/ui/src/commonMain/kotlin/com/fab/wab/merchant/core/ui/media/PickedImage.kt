package com.fab.wab.merchant.core.ui.media

/** Device-compressed image bytes ready for a presigned upload. */
class PickedImage(val bytes: ByteArray, val contentType: String)

object ImagePickerDefaults {
    const val JPEG_CONTENT_TYPE = "image/jpeg"
    const val JPEG_QUALITY = 85
}
