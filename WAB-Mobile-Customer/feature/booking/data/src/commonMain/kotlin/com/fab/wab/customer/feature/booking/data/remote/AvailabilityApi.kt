package com.fab.wab.customer.feature.booking.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdAvailabilityBody
import com.fab.wab.customer.core.data.contract.generated.PostSalonsBySalonIdAvailabilityData
import com.fab.wab.customer.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody

class AvailabilityApi(private val client: HttpClient) {
    suspend fun slots(salonId: String, body: PostSalonsBySalonIdAvailabilityBody): BaseResponse<PostSalonsBySalonIdAvailabilityData> {
        val op = CustomerOperations.postSalonsBySalonIdAvailability
        return client.post(op.pathWith(op.pathParams.single() to salonId)) { setBody(body) }.body()
    }
}
