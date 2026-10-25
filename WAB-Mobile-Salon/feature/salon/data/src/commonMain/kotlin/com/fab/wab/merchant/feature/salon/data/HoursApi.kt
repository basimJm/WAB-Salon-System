package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonHoursClosuresByIdBody
import com.fab.wab.merchant.core.data.contract.generated.PatchSalonHoursClosuresByIdData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonHoursClosuresBody
import com.fab.wab.merchant.core.data.contract.generated.PostSalonHoursClosuresData
import com.fab.wab.merchant.core.data.contract.generated.PutSalonHoursWeeklyBody
import com.fab.wab.merchant.core.data.contract.generated.PutSalonHoursWeeklyData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement

private const val ID = "id"

/** `/salon/hours…` or, for a chosen branch, `/branches/{branchId}/hours…` (same bodies, MER-064). */
class HoursApi(private val client: HttpClient) {
    suspend fun load(branchId: String?): BaseResponse<GetSalonHoursData> =
        client.get(branchPath(MerchantOperations.getSalonHours, MerchantOperations.getBranchesByBranchIdHours, branchId)).body()

    suspend fun saveWeek(branchId: String?, body: PutSalonHoursWeeklyBody): BaseResponse<PutSalonHoursWeeklyData> =
        client.put(branchPath(MerchantOperations.putSalonHoursWeekly, MerchantOperations.putBranchesByBranchIdHoursWeekly, branchId)) {
            setBody(body)
        }.body()

    suspend fun addClosure(branchId: String?, body: PostSalonHoursClosuresBody): BaseResponse<PostSalonHoursClosuresData> =
        client.post(
            branchPath(MerchantOperations.postSalonHoursClosures, MerchantOperations.postBranchesByBranchIdHoursClosures, branchId),
        ) { setBody(body) }.body()

    suspend fun updateClosure(
        branchId: String?,
        id: String,
        body: PatchSalonHoursClosuresByIdBody,
    ): BaseResponse<PatchSalonHoursClosuresByIdData> = client.patch(
        branchPath(
            MerchantOperations.patchSalonHoursClosuresById,
            MerchantOperations.patchBranchesByBranchIdHoursClosuresById,
            branchId,
            ID to id,
        ),
    ) { setBody(body) }.body()

    suspend fun deleteClosure(branchId: String?, id: String): BaseResponse<JsonElement?> = client.delete(
        branchPath(
            MerchantOperations.deleteSalonHoursClosuresById,
            MerchantOperations.deleteBranchesByBranchIdHoursClosuresById,
            branchId,
            ID to id,
        ),
    ).body()
}
