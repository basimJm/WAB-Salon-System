package com.fab.wab.merchant.core.data.upload

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsConfirmBody
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsConfirmData
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsLicenseConfirmBody
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsLicenseConfirmData
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsLicensePresignBody
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsLicensePresignData
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsPresignBody
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsPresignData
import com.fab.wab.merchant.core.domain.upload.PresignedUpload
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.onUpload
import io.ktor.client.request.headers
import io.ktor.client.request.post
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpMethod
import io.ktor.http.contentType
import io.ktor.http.isSuccess

/** [api] = the WAB client (envelope, auth); [storage] = a bare client for the presigned PUT (no base URL, no bearer). */
class UploadsApi(private val api: HttpClient, private val storage: HttpClient) {
    suspend fun presign(body: PostUploadsPresignBody): BaseResponse<PostUploadsPresignData> =
        api.post(MerchantOperations.postUploadsPresign.path) { setBody(body) }.body()

    suspend fun confirm(key: String): BaseResponse<PostUploadsConfirmData> =
        api.post(MerchantOperations.postUploadsConfirm.path) { setBody(PostUploadsConfirmBody(key)) }.body()

    suspend fun presignLicense(body: PostUploadsLicensePresignBody): BaseResponse<PostUploadsLicensePresignData> =
        api.post(MerchantOperations.postUploadsLicensePresign.path) { setBody(body) }.body()

    suspend fun confirmLicense(key: String): BaseResponse<PostUploadsLicenseConfirmData> =
        api.post(MerchantOperations.postUploadsLicenseConfirm.path) { setBody(PostUploadsLicenseConfirmBody(key)) }.body()

    /** PUTs to storage reporting 0..1 progress; true on a 2xx answer. */
    suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String, onProgress: (Float) -> Unit): Boolean {
        val response = storage.request(target.url) {
            method = HttpMethod.parse(target.method)
            headers { target.headers.forEach { (name, value) -> append(name, value) } }
            contentType(ContentType.parse(contentType))
            setBody(bytes)
            onUpload { sent, total ->
                val length = total ?: bytes.size.toLong()
                if (length > 0) onProgress(sent.toFloat() / length)
            }
        }
        return response.status.isSuccess()
    }
}
