package com.fab.wab.customer.core.data.upload

import com.fab.wab.customer.core.data.contract.generated.PostUploadsPresignBody
import com.fab.wab.customer.core.data.contract.generated.PostUploadsPresignData
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.core.domain.upload.PresignedUpload
import com.fab.wab.customer.core.domain.upload.UploadsRepository
import com.fab.wab.customer.core.network.safeApiCall
import kotlinx.serialization.json.JsonPrimitive

class UploadsRepositoryImpl(private val api: UploadsApi) : UploadsRepository {
    override suspend fun presign(purpose: String, contentType: String, size: Int): AppResult<PresignedUpload> =
        safeApiCall { api.presign(PostUploadsPresignBody(purpose, contentType, size)) }.mapSuccess { it.data.toDomain() }

    override suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String): AppResult<Unit> {
        val ok = runCatching { api.upload(target, bytes, contentType) }
            .getOrElse { e -> return AppResult.Error(AppError.NetworkError(e.message.orEmpty())) }
        return if (ok) AppResult.Success(Unit) else AppResult.Error(AppError.HttpError(STORAGE_REJECTED, null))
    }

    override suspend fun confirm(key: String): AppResult<String?> = safeApiCall { api.confirm(key) }.mapSuccess { it.data.url }

    private companion object {
        /** The storage answered outside 2xx (expired or wrong signature); shown as a generic upload failure. */
        const val STORAGE_REJECTED = 400
    }
}

fun PostUploadsPresignData.toDomain() = PresignedUpload(
    key = key,
    url = upload.url,
    method = upload.method,
    headers = upload.headers.mapNotNull { (name, value) -> (value as? JsonPrimitive)?.content?.let { name to it } }.toMap(),
    maxBytes = maxBytes.toLong(),
)
