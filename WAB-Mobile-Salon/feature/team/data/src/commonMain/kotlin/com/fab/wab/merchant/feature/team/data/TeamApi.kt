package com.fab.wab.merchant.feature.team.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdData
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PatchTeamMembersByIdData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersBody
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersByIdDeactivateData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersByIdReactivateData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersData
import com.fab.wab.merchant.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonObject

internal const val ID = "id"
private const val PAGE = "page"
private const val PAGE_SIZE = "pageSize"

class TeamApi(private val client: HttpClient) {
    suspend fun members(page: Int, pageSize: Int): BaseResponse<List<GetTeamMembersDataItem>> =
        client.get(MerchantOperations.getTeamMembers.path) {
            parameter(PAGE, page)
            parameter(PAGE_SIZE, pageSize)
        }.body()

    suspend fun member(id: String): BaseResponse<GetTeamMembersByIdData> = client.get(MerchantOperations.getTeamMembersById.pathWith(ID to id)).body()

    suspend fun create(body: PostTeamMembersBody): BaseResponse<PostTeamMembersData> =
        client.post(MerchantOperations.postTeamMembers.path) { setBody(body) }.body()

    /** JSON body so a removed photo goes out as `photoKey: null` (the client omits nulls). */
    suspend fun update(id: String, body: JsonObject): BaseResponse<PatchTeamMembersByIdData> =
        client.patch(MerchantOperations.patchTeamMembersById.pathWith(ID to id)) { setBody(body) }.body()

    suspend fun deactivate(id: String): BaseResponse<PostTeamMembersByIdDeactivateData> =
        client.post(MerchantOperations.postTeamMembersByIdDeactivate.pathWith(ID to id)).body()

    suspend fun reactivate(id: String): BaseResponse<PostTeamMembersByIdReactivateData> =
        client.post(MerchantOperations.postTeamMembersByIdReactivate.pathWith(ID to id)).body()
}
