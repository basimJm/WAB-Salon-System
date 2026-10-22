package com.fab.wab.merchant.core.domain.upload

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.channelFlow

/**
 * Uploads one file: presign for [UploadPurpose], PUT the bytes with progress, confirm (the server checks the real type
 * and size). Emits [UploadProgress.Uploading] from 0 to 1, then [UploadProgress.Done] or [UploadProgress.Failed];
 * a retry is simply a new call (presigned URLs expire).
 */
class UploadFileUseCase(private val repository: UploadsRepository) {
    operator fun invoke(file: LocalFile, purpose: UploadPurpose): Flow<UploadProgress> = channelFlow {
        send(UploadProgress.Uploading(0f))
        val outcome = when (val presigned = repository.presign(purpose, file.contentType, file.sizeBytes)) {
            is AppResult.Success -> uploadAndConfirm(presigned.data, file, purpose) { fraction ->
                trySend(UploadProgress.Uploading(fraction.coerceIn(0f, 1f)))
            }
            else -> UploadProgress.Failed(presigned.errorOrUnknown())
        }
        send(outcome)
    }

    private suspend fun uploadAndConfirm(
        target: PresignedUpload,
        file: LocalFile,
        purpose: UploadPurpose,
        onProgress: (Float) -> Unit,
    ): UploadProgress {
        val sent = repository.upload(target, file.bytes, file.contentType, onProgress)
        if (sent !is AppResult.Success) return UploadProgress.Failed(sent.errorOrUnknown())
        return when (val confirmed = repository.confirm(purpose, target.key)) {
            is AppResult.Success -> UploadProgress.Done(confirmed.data)
            else -> UploadProgress.Failed(confirmed.errorOrUnknown())
        }
    }

    private fun AppResult<*>.errorOrUnknown(): AppError =
        (this as? AppResult.Error)?.appError ?: AppError.UnknownError(UNEXPECTED_STATE)

    private companion object {
        const val UNEXPECTED_STATE = "upload_unexpected_state"
    }
}
