package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetCatalogServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonServicesByIdData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonServicesBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonServicesData
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
private const val BUSINESS_TYPE = "businessType"
private const val GENDER = "gender"

class ServicesApi(private val client: HttpClient) {
    suspend fun services(branchId: String?, page: Int, pageSize: Int): BaseResponse<List<GetSalonServicesDataItem>> =
        client.get(branchPath(MerchantOperations.getSalonServices, MerchantOperations.getBranchesByBranchIdServices, branchId)) {
            parameter(PAGE, page)
            parameter(PAGE_SIZE, pageSize)
        }.body()

    /** BUSINESS_DOMAIN §5.19: the business's own type; [gender] narrows a MALE/FEMALE salon to its audience + BOTH. */
    suspend fun catalog(businessType: String, gender: String?, page: Int, pageSize: Int): BaseResponse<List<GetCatalogServicesDataItem>> =
        client.get(MerchantOperations.getCatalogServices.path) {
            parameter(BUSINESS_TYPE, businessType)
            gender?.let { parameter(GENDER, it) }
            parameter(PAGE, page)
            parameter(PAGE_SIZE, pageSize)
        }.body()

    suspend fun create(branchId: String?, body: PostSalonServicesBody): BaseResponse<PostSalonServicesData> =
        client.post(branchPath(MerchantOperations.postSalonServices, MerchantOperations.postBranchesByBranchIdServices, branchId)) {
            setBody(body)
        }.body()

    /** JSON body so a cleared description goes out as `null` (the client omits nulls). */
    suspend fun update(branchId: String?, id: String, body: JsonObject): BaseResponse<PatchSalonServicesByIdData> = client.patch(
        branchPath(MerchantOperations.patchSalonServicesById, MerchantOperations.patchBranchesByBranchIdServicesById, branchId, ID to id),
    ) { setBody(body) }.body()
}
