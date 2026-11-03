package com.fab.wab.customer.core.domain.upload

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.ErrorCode

/** `POST /uploads/presign` result: where and how the device PUTs the bytes (PRD §3.16). */
data class PresignedUpload(
    val key: String,
    val url: String,
    val method: String,
    val headers: Map<String, String>,
    val maxBytes: Long,
)

/** Contract `UploadPurpose` values the customer app uses. */
object UploadPurpose {
    const val CUSTOMER_AVATAR = "CUSTOMER_AVATAR"
    /** A tattoo design image of one booking person (BUSINESS_DOMAIN §5.23). */
    const val BOOKING_REFERENCE = "BOOKING_REFERENCE"
}

/** Presigned upload flow shared by the profile photo and the tattoo design image. */
interface UploadsRepository {
    suspend fun presign(purpose: String, contentType: String, size: Int): AppResult<PresignedUpload>
    suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String): AppResult<Unit>
    /** Returns the final CDN URL when the backend knows it. */
    suspend fun confirm(key: String): AppResult<String?>
}

/**
 * PRD §3.16: presign → size check → direct upload → confirm; returns the confirmed key. Any failed step is the result.
 */
suspend fun UploadsRepository.uploadConfirmed(purpose: String, bytes: ByteArray, contentType: String): AppResult<String> =
    presign(purpose, contentType, bytes.size).andThen { presigned ->
        if (bytes.size > presigned.maxBytes) {
            AppResult.Error(uploadTooLarge(presigned.maxBytes))
        } else {
            upload(presigned, bytes, contentType)
                .andThen { confirm(presigned.key) }
                .andThen { AppResult.Success(presigned.key) }
        }
    }

/** Runs [next] on success; errors and the loading marker pass through unchanged. */
suspend inline fun <T, R> AppResult<T>.andThen(next: (T) -> AppResult<R>): AppResult<R> = when (this) {
    is AppResult.Success -> next(data)
    is AppResult.Error -> this
    AppResult.Loading -> AppResult.Loading
}

/** Mirrors the server's `UPLOAD_TOO_LARGE` so the UI shows the same localized text without a round trip. */
fun uploadTooLarge(maxBytes: Long): AppError =
    AppError.ServerError(code = ErrorCode.UPLOAD_TOO_LARGE, statusCode = HTTP_PAYLOAD_TOO_LARGE, message = maxBytes.toString())

private const val HTTP_PAYLOAD_TOO_LARGE = 413
