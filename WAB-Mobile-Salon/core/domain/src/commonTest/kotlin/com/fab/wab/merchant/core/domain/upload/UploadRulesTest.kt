package com.fab.wab.merchant.core.domain.upload

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class UploadRulesTest {
    private fun file(type: String, bytes: Long = 1_000L, durationMs: Long? = null) =
        LocalFile(id = type, name = "f", bytes = ByteArray(bytes.toInt()), contentType = type, durationMs = durationMs)

    @Test
    fun kindComesFromTheContentType() {
        assertEquals(UploadKind.IMAGE, file("image/jpeg").kind)
        assertEquals(UploadKind.VIDEO, file("video/mp4").kind)
        assertEquals(UploadKind.DOCUMENT, file("application/pdf").kind)
    }

    @Test
    fun documentsAcceptImagesAndPdfOnly() {
        assertNull(validateUpload(file("application/pdf"), UploadSlot.DOCUMENTS))
        assertNull(validateUpload(file("image/png"), UploadSlot.DOCUMENTS))
        assertEquals(UploadRejection.WRONG_TYPE, validateUpload(file("application/msword"), UploadSlot.DOCUMENTS))
        assertEquals(UploadRejection.WRONG_TYPE, validateUpload(file("video/mp4"), UploadSlot.DOCUMENTS))
    }

    @Test
    fun sizeLimitsFollowPrdSection12() {
        val tenMb = UploadLimits.DOCUMENT_MAX_BYTES
        assertNull(validateUpload(file("application/pdf", tenMb), UploadSlot.DOCUMENTS))
        assertEquals(UploadRejection.TOO_LARGE, validateUpload(file("application/pdf", tenMb + 1), UploadSlot.DOCUMENTS))
        assertEquals(UploadRejection.TOO_LARGE, validateUpload(file("image/jpeg", UploadLimits.IMAGE_MAX_BYTES + 1), UploadSlot.IMAGE))
        assertNull(validateUpload(file("video/mp4", tenMb + 1), UploadSlot.MEDIA))
    }

    @Test
    fun videosAreMediaOnlyAndAtMostSixtySeconds() {
        assertEquals(UploadRejection.WRONG_TYPE, validateUpload(file("video/mp4"), UploadSlot.IMAGE))
        assertNull(validateUpload(file("video/mp4", durationMs = UploadLimits.VIDEO_MAX_DURATION_MS), UploadSlot.MEDIA))
        assertEquals(
            UploadRejection.TOO_LONG,
            validateUpload(file("video/mp4", durationMs = UploadLimits.VIDEO_MAX_DURATION_MS + 1), UploadSlot.MEDIA),
        )
    }

    @Test
    fun acceptUploadsCapsAtTheFreeSlots() {
        val picked = listOf(file("application/pdf"), file("text/plain"), file("image/jpeg"), file("image/png"))
        val (accepted, refused) = acceptUploads(picked, UploadSlot.DOCUMENTS, remaining = remainingSlots(current = 3, max = 5))
        assertEquals(2, accepted.size)
        assertEquals(listOf(UploadRejection.WRONG_TYPE, UploadRejection.TOO_MANY), refused)
        assertEquals(0, remainingSlots(current = 7, max = 5))
    }
}
