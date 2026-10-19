package com.fab.wab.customer.feature.profile.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.PostUploadsConfirmBody
import com.fab.wab.customer.core.data.contract.generated.PostUploadsConfirmData
import com.fab.wab.customer.core.data.contract.generated.PostUploadsPresignBody
import com.fab.wab.customer.core.data.contract.generated.PostUploadsPresignData
import com.fab.wab.customer.feature.profile.domain.model.PresignedUpload
import io.ktor.client.HttpClient
import io.ktor.client.call.body
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
        api.post(CustomerOperations.postUploadsPresign.path) { setBody(body) }.body()

    suspend fun confirm(key: String): BaseResponse<PostUploadsConfirmData> =
        api.post(CustomerOperations.postUploadsConfirm.path) { setBody(PostUploadsConfirmBody(key)) }.body()

    /** Returns the HTTP status; the caller maps a non-2xx answer to an error. */
    suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String): Boolean {
        val response = storage.request(target.url) {
            method = HttpMethod.parse(target.method)
            headers { target.headers.forEach { (name, value) -> append(name, value) } }
            contentType(ContentType.parse(contentType))
            setBody(bytes)
        }
        return response.status.isSuccess()
    }
}
