package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetCatalogServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonServicesByIdData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonServicesBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonServicesData
import com.fab.wab.merchant.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonObject

private const val ID = "id"
private const val PAGE = "page"
private const val PAGE_SIZE = "pageSize"
private const val GENDER = "gender"

class ServicesApi(private val client: HttpClient) {
    suspend fun services(page: Int, pageSize: Int): BaseResponse<List<GetSalonServicesDataItem>> =
        client.get(MerchantOperations.getSalonServices.path) {
            parameter(PAGE, page)
            parameter(PAGE_SIZE, pageSize)
        }.body()

    suspend fun catalog(gender: String, page: Int, pageSize: Int): BaseResponse<List<GetCatalogServicesDataItem>> =
        client.get(MerchantOperations.getCatalogServices.path) {
            parameter(GENDER, gender)
            parameter(PAGE, page)
            parameter(PAGE_SIZE, pageSize)
        }.body()

    suspend fun create(body: PostSalonServicesBody): BaseResponse<PostSalonServicesData> =
        client.post(MerchantOperations.postSalonServices.path) { setBody(body) }.body()

    /** JSON body so a cleared description goes out as `null` (the client omits nulls). */
    suspend fun update(id: String, body: JsonObject): BaseResponse<PatchSalonServicesByIdData> =
        client.patch(MerchantOperations.patchSalonServicesById.pathWith(ID to id)) { setBody(body) }.body()
}
