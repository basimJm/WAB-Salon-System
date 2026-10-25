package com.fab.wab.merchant.core.domain.upload

import com.fab.wab.merchant.core.domain.AppResult

/**
 * Presign → upload → confirm through the merchant `uploads` operations; [UploadPurpose.LICENSE_DOCUMENT] uses the public
 * license variants (registration happens before the salon exists).
 */
interface UploadsRepository {
    suspend fun presign(purpose: UploadPurpose, contentType: String, size: Long): AppResult<PresignedUpload>

    /** PUTs [bytes] to storage; [onProgress] receives 0..1. */
    suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String, onProgress: (Float) -> Unit): AppResult<Unit>

    suspend fun confirm(purpose: UploadPurpose, key: String): AppResult<ConfirmedUpload>
}
