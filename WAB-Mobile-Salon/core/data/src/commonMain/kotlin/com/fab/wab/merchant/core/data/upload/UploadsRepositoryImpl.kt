package com.fab.wab.merchant.core.data.upload

import com.fab.wab.merchant.core.data.contract.generated.PostUploadsLicensePresignBody
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsLicensePresignData
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsPresignBody
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsPresignData
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.upload.ConfirmedUpload
import com.fab.wab.merchant.core.domain.upload.PresignedUpload
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadsRepository
import com.fab.wab.merchant.core.network.safeApiCall
import io.ktor.client.plugins.ResponseException
import kotlinx.io.IOException
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

class UploadsRepositoryImpl(private val api: UploadsApi) : UploadsRepository {
    override suspend fun presign(purpose: UploadPurpose, contentType: String, size: Long): AppResult<PresignedUpload> {
        val bytes = size.toInt()
        return if (purpose == UploadPurpose.LICENSE_DOCUMENT) {
            safeApiCall { api.presignLicense(PostUploadsLicensePresignBody(contentType, bytes)) }.mapSuccess { it.data.toDomain() }
        } else {
            safeApiCall { api.presign(PostUploadsPresignBody(purpose.name, contentType, bytes)) }.mapSuccess { it.data.toDomain() }
        }
    }

    override suspend fun upload(
        target: PresignedUpload,
        bytes: ByteArray,
        contentType: String,
        onProgress: (Float) -> Unit,
    ): AppResult<Unit> {
        val ok = try {
            api.upload(target, bytes, contentType, onProgress)
        } catch (e: IOException) {
            return AppResult.Error(AppError.NetworkError(e.message.orEmpty()))
        } catch (e: ResponseException) {
            return AppResult.Error(AppError.HttpError(e.response.status.value, e.message))
        }
        return if (ok) AppResult.Success(Unit) else AppResult.Error(AppError.HttpError(STORAGE_REJECTED, null))
    }

    override suspend fun confirm(purpose: UploadPurpose, key: String): AppResult<ConfirmedUpload> =
        if (purpose == UploadPurpose.LICENSE_DOCUMENT) {
            safeApiCall { api.confirmLicense(key) }.mapSuccess { ConfirmedUpload(it.data.key, it.data.url) }
        } else {
            safeApiCall { api.confirm(key) }.mapSuccess { ConfirmedUpload(it.data.key, it.data.url) }
        }

    private companion object {
        /** The storage answered outside 2xx (expired or wrong signature); shown as a generic upload failure. */
        const val STORAGE_REJECTED = 400
    }
}

internal fun PostUploadsPresignData.toDomain() = PresignedUpload(
    key,
    upload.url,
    upload.method,
    upload.headers.strings(),
    maxBytes.toLong(),
)

internal fun PostUploadsLicensePresignData.toDomain() =
    PresignedUpload(key, upload.url, upload.method, upload.headers.strings(), maxBytes.toLong())

private fun Map<String, JsonElement>.strings(): Map<String, String> =
    mapNotNull { (name, value) -> (value as? JsonPrimitive)?.content?.let { name to it } }.toMap()
