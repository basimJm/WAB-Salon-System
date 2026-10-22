package com.fab.wab.merchant.feature.team.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdLeavesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdStaffData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PatchTeamMembersByIdLeavesByLeaveIdData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersByIdLeavesBody
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersByIdLeavesData
import com.fab.wab.merchant.core.data.contract.generated.PutTeamMembersByIdStaffBody
import com.fab.wab.merchant.core.data.contract.generated.PutTeamMembersByIdStaffData
import com.fab.wab.merchant.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

private const val LEAVE_ID = "leaveId"
private const val PAGE = "page"
private const val PAGE_SIZE = "pageSize"

class StaffApi(private val client: HttpClient) {
    suspend fun profile(id: String): BaseResponse<GetTeamMembersByIdStaffData> =
        client.get(MerchantOperations.getTeamMembersByIdStaff.pathWith(ID to id)).body()

    suspend fun save(id: String, body: PutTeamMembersByIdStaffBody): BaseResponse<PutTeamMembersByIdStaffData> =
        client.put(MerchantOperations.putTeamMembersByIdStaff.pathWith(ID to id)) { setBody(body) }.body()

    suspend fun leaves(id: String): BaseResponse<List<GetTeamMembersByIdLeavesDataItem>> =
        client.get(MerchantOperations.getTeamMembersByIdLeaves.pathWith(ID to id)).body()

    suspend fun addLeave(id: String, body: PostTeamMembersByIdLeavesBody): BaseResponse<PostTeamMembersByIdLeavesData> =
        client.post(MerchantOperations.postTeamMembersByIdLeaves.pathWith(ID to id)) { setBody(body) }.body()

    /** JSON body so a cleared note goes out as `null`. */
    suspend fun updateLeave(id: String, leaveId: String, body: JsonObject): BaseResponse<PatchTeamMembersByIdLeavesByLeaveIdData> =
        client.patch(MerchantOperations.patchTeamMembersByIdLeavesByLeaveId.pathWith(ID to id, LEAVE_ID to leaveId)) { setBody(body) }.body()

    suspend fun deleteLeave(id: String, leaveId: String): BaseResponse<JsonElement?> =
        client.delete(MerchantOperations.deleteTeamMembersByIdLeavesByLeaveId.pathWith(ID to id, LEAVE_ID to leaveId)).body()

    suspend fun services(page: Int, pageSize: Int): BaseResponse<List<GetSalonServicesDataItem>> =
        client.get(MerchantOperations.getSalonServices.path) {
            parameter(PAGE, page)
            parameter(PAGE_SIZE, pageSize)
        }.body()

    suspend fun hours(): BaseResponse<GetSalonHoursData> = client.get(MerchantOperations.getSalonHours.path).body()
}
