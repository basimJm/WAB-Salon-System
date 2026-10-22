package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetSalonGalleryDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostSalonGalleryBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonGalleryData
import com.fab.wab.merchant.core.data.contract.generated.PutSalonGalleryOrderBody
import com.fab.wab.merchant.core.data.contract.generated.PutSalonGalleryOrderDataItem
import com.fab.wab.merchant.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement

private const val ID = "id"

class GalleryApi(private val client: HttpClient) {
    suspend fun list(): BaseResponse<List<GetSalonGalleryDataItem>> = client.get(MerchantOperations.getSalonGallery.path).body()

    suspend fun add(body: PostSalonGalleryBody): BaseResponse<PostSalonGalleryData> =
        client.post(MerchantOperations.postSalonGallery.path) { setBody(body) }.body()

    suspend fun reorder(body: PutSalonGalleryOrderBody): BaseResponse<List<PutSalonGalleryOrderDataItem>> =
        client.put(MerchantOperations.putSalonGalleryOrder.path) { setBody(body) }.body()

    suspend fun delete(id: String): BaseResponse<JsonElement?> = client.delete(MerchantOperations.deleteSalonGalleryById.pathWith(ID to id)).body()
}
