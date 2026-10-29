package com.fab.wab.merchant.core.domain.upload

import com.fab.wab.merchant.core.domain.AppError

/** Upload purposes of `POST /uploads/presign` (the server restricts type, size and expiry per purpose). */
enum class UploadPurpose {
    MEMBER_PHOTO,
    SALON_COVER,
    SALON_PROFILE,
    GALLERY_IMAGE,
    GALLERY_VIDEO,
    SERVICE_MEDIA,

    /** Picture attached to a catalog request (SERVICES_MANAGE). */
    CATALOG_IMAGE,

    /** Public flow before the salon exists: `POST /uploads/license/presign` + `/confirm` (private file). */
    LICENSE_DOCUMENT,

    /** A clinic's medical license (BUSINESS_DOMAIN §5.19): the same public license flow with this purpose. */
    MEDICAL_LICENSE,
    ;

    /** Uploaded through the public license routes (the applicant has no salon session yet). */
    val isLicense: Boolean get() = this == LICENSE_DOCUMENT || this == MEDICAL_LICENSE
}

/** What a picker returned; limits differ per kind (PRD §12). */
enum class UploadKind { DOCUMENT, IMAGE, VIDEO }

/** A file picked on the device, already compressed where the platform does it (images). */
class LocalFile(
    val id: String,
    val name: String,
    val bytes: ByteArray,
    val contentType: String,
    val durationMs: Long? = null,
) {
    val sizeBytes: Long get() = bytes.size.toLong()
    val kind: UploadKind
        get() = when {
            contentType.startsWith(UploadLimits.VIDEO_PREFIX) -> UploadKind.VIDEO
            contentType.startsWith(UploadLimits.IMAGE_PREFIX) -> UploadKind.IMAGE
            else -> UploadKind.DOCUMENT
        }
}

/** Where to PUT the bytes (`upload.url/method/headers`) and the storage [key] to confirm and save. */
data class PresignedUpload(
    val key: String,
    val url: String,
    val method: String,
    val headers: Map<String, String>,
    val maxBytes: Long,
)

/** A confirmed upload: [url] is the CDN address, null for private files (license documents). */
data class ConfirmedUpload(val key: String, val url: String?)

/** Why a picked file is refused before any upload. */
enum class UploadRejection { TOO_LARGE, WRONG_TYPE, TOO_LONG, TOO_MANY }

/** Progress of one presign → upload → confirm run. */
sealed interface UploadProgress {
    /** [fraction] in 0..1 while the bytes go to storage. */
    data class Uploading(val fraction: Float) : UploadProgress

    data class Done(val upload: ConfirmedUpload) : UploadProgress

    data class Failed(val error: AppError) : UploadProgress
}
