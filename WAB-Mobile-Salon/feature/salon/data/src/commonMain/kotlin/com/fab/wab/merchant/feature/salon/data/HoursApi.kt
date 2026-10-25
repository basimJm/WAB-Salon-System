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
import com.fab.wab.merchant.core.data.contract.pathWith
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

class HoursApi(private val client: HttpClient) {
    suspend fun load(): BaseResponse<GetSalonHoursData> = client.get(MerchantOperations.getSalonHours.path).body()

    suspend fun saveWeek(body: PutSalonHoursWeeklyBody): BaseResponse<PutSalonHoursWeeklyData> =
        client.put(MerchantOperations.putSalonHoursWeekly.path) { setBody(body) }.body()

    suspend fun addClosure(body: PostSalonHoursClosuresBody): BaseResponse<PostSalonHoursClosuresData> =
        client.post(MerchantOperations.postSalonHoursClosures.path) { setBody(body) }.body()

    suspend fun updateClosure(id: String, body: PatchSalonHoursClosuresByIdBody): BaseResponse<PatchSalonHoursClosuresByIdData> =
        client.patch(MerchantOperations.patchSalonHoursClosuresById.pathWith(ID to id)) { setBody(body) }.body()

    suspend fun deleteClosure(id: String): BaseResponse<JsonElement?> = client.delete(
        MerchantOperations.deleteSalonHoursClosuresById.pathWith(ID to id),
    ).body()

}
