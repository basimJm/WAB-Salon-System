package com.fab.wab.customer.feature.booking.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDraftsByIdData
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsBody
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsData
import com.fab.wab.customer.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement

class BookingDraftApi(private val client: HttpClient) {
    suspend fun create(body: PostBookingsDraftsBody): BaseResponse<PostBookingsDraftsData> =
        client.post(CustomerOperations.postBookingsDrafts.path) { setBody(body) }.body()

    suspend fun get(draftId: String): BaseResponse<GetBookingsDraftsByIdData> {
        val op = CustomerOperations.getBookingsDraftsById
        return client.get(op.pathWith(op.pathParams.single() to draftId)).body()
    }

    suspend fun delete(draftId: String): BaseResponse<JsonElement?> {
        val op = CustomerOperations.deleteBookingsDraftsById
        return client.delete(op.pathWith(op.pathParams.single() to draftId)).body()
    }
}
