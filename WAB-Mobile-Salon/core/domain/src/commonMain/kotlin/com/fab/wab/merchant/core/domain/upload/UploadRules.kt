package com.fab.wab.merchant.core.domain.upload

/** PRD §12 validation rules for files, plus the gallery caps of design 05 Salon. */
object UploadLimits {
    private const val BYTES_PER_MB = 1_048_576L

    const val DOCUMENT_MIN_FILES = 1
    const val DOCUMENT_MAX_FILES = 5
    const val DOCUMENT_MAX_BYTES = 10 * BYTES_PER_MB
    const val IMAGE_MAX_BYTES = 10 * BYTES_PER_MB
    const val VIDEO_MAX_BYTES = 50 * BYTES_PER_MB
    const val VIDEO_MAX_DURATION_MS = 60_000L
    const val GALLERY_MAX_IMAGES = 50
    const val GALLERY_MAX_VIDEOS = 10

    const val IMAGE_PREFIX = "image/"
    const val VIDEO_PREFIX = "video/"
    const val PDF_TYPE = "application/pdf"

    fun maxBytes(kind: UploadKind): Long = when (kind) {
        UploadKind.DOCUMENT -> DOCUMENT_MAX_BYTES
        UploadKind.IMAGE -> IMAGE_MAX_BYTES
        UploadKind.VIDEO -> VIDEO_MAX_BYTES
    }
}

/** Which kinds a slot accepts. */
enum class UploadSlot(val accepts: Set<UploadKind>) {
    /** License / registration documents: images or PDF. */
    DOCUMENTS(setOf(UploadKind.IMAGE, UploadKind.DOCUMENT)),

    /** Cover, profile, member photo, catalog-like single images. */
    IMAGE(setOf(UploadKind.IMAGE)),

    /** Gallery and service media: images and short videos. */
    MEDIA(setOf(UploadKind.IMAGE, UploadKind.VIDEO)),
}

/** First rule [file] breaks for [slot], or null when it may be uploaded. Documents must be PDF when not images. */
fun validateUpload(file: LocalFile, slot: UploadSlot): UploadRejection? {
    val kind = file.kind
    val typeOk = kind in slot.accepts && (kind != UploadKind.DOCUMENT || file.contentType == UploadLimits.PDF_TYPE)
    val limit = if (slot == UploadSlot.DOCUMENTS) UploadLimits.DOCUMENT_MAX_BYTES else UploadLimits.maxBytes(kind)
    val duration = file.durationMs
    return when {
        !typeOk -> UploadRejection.WRONG_TYPE
        file.sizeBytes > limit -> UploadRejection.TOO_LARGE
        kind == UploadKind.VIDEO && duration != null && duration > UploadLimits.VIDEO_MAX_DURATION_MS -> UploadRejection.TOO_LONG
        else -> null
    }
}

/** How many more files fit when [current] are already attached (never negative). */
fun remainingSlots(current: Int, max: Int): Int = (max - current).coerceAtLeast(0)

/** Splits [picked] into the files to upload and the refusals, honouring [remaining] free slots. */
fun acceptUploads(picked: List<LocalFile>, slot: UploadSlot, remaining: Int): Pair<List<LocalFile>, List<UploadRejection>> {
    val accepted = mutableListOf<LocalFile>()
    val refused = mutableListOf<UploadRejection>()
    picked.forEach { file ->
        val rejection = validateUpload(file, slot) ?: if (accepted.size >= remaining) UploadRejection.TOO_MANY else null
        if (rejection == null) accepted += file else refused += rejection
    }
    return accepted to refused
}
