package com.fab.wab.customer.feature.salon.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdData
import com.fab.wab.customer.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class SalonDetailsApi(private val client: HttpClient) {
    suspend fun details(salonId: String): BaseResponse<GetSalonsBySalonIdData> {
        val op = CustomerOperations.getSalonsBySalonId
        return client.get(op.pathWith(op.pathParams.single() to salonId)).body()
    }

    suspend fun staffMember(salonId: String, memberId: String): BaseResponse<GetSalonsBySalonIdStaffByMemberIdData> {
        val op = CustomerOperations.getSalonsBySalonIdStaffByMemberId
        return client.get(op.pathWith(op.pathParams[0] to salonId, op.pathParams[1] to memberId)).body()
    }
}
