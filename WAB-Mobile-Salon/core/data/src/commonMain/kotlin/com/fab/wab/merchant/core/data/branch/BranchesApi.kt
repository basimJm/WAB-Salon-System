package com.fab.wab.merchant.core.data.branch

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetBranchesByBranchIdData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostBranchesBody
import com.fab.wab.merchant.core.data.contract.generated.PostBranchesByBranchIdOfflineBody
import com.fab.wab.merchant.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonObject

private const val BRANCH_ID = "branchId"

/**
 * `/merchant/v1/branches…` (OWNER only). Every operation answers the same `BranchView`, so all of them decode into
 * one generated shape.
 */
class BranchesApi(private val client: HttpClient) {
    suspend fun list(): BaseResponse<List<GetBranchesByBranchIdData>> = client.get(MerchantOperations.getBranches.path).body()

    suspend fun create(body: PostBranchesBody): BaseResponse<GetBranchesByBranchIdData> =
        client.post(MerchantOperations.postBranches.path) { setBody(body) }.body()

    /** JSON body so a removed WhatsApp number goes out as `whatsapp: null` (the client omits nulls). */
    suspend fun update(id: String, body: JsonObject): BaseResponse<GetBranchesByBranchIdData> =
        client.patch(MerchantOperations.patchBranchesByBranchId.pathWith(BRANCH_ID to id)) { setBody(body) }.body()

    suspend fun setMain(id: String): BaseResponse<GetBranchesByBranchIdData> =
        client.post(MerchantOperations.postBranchesByBranchIdMain.pathWith(BRANCH_ID to id)).body()

    suspend fun setOffline(id: String, reason: String): BaseResponse<GetBranchesByBranchIdData> =
        client.post(MerchantOperations.postBranchesByBranchIdOffline.pathWith(BRANCH_ID to id)) {
            setBody(PostBranchesByBranchIdOfflineBody(reason))
        }.body()

    suspend fun setOnline(id: String): BaseResponse<GetBranchesByBranchIdData> =
        client.post(MerchantOperations.postBranchesByBranchIdOnline.pathWith(BRANCH_ID to id)).body()

    suspend fun close(id: String): BaseResponse<GetBranchesByBranchIdData> =
        client.post(MerchantOperations.postBranchesByBranchIdClose.pathWith(BRANCH_ID to id)).body()
}
