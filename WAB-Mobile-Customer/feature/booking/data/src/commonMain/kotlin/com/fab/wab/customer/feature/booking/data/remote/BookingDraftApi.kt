package com.fab.wab.customer.feature.booking.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDraftsByIdData
import com.fab.wab.customer.core.data.contract.generated.PostBookingsBody
import com.fab.wab.customer.core.data.contract.generated.PostBookingsData
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsByIdVerifyOtpBody
import com.fab.wab.customer.core.data.contract.generated.PostBookingsDraftsByIdVerifyOtpData
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

    suspend fun verifyOtp(draftId: String, body: PostBookingsDraftsByIdVerifyOtpBody): BaseResponse<PostBookingsDraftsByIdVerifyOtpData> {
        val op = CustomerOperations.postBookingsDraftsByIdVerifyOtp
        return client.post(op.pathWith(op.pathParams.single() to draftId)) { setBody(body) }.body()
    }

    suspend fun createBooking(body: PostBookingsBody): BaseResponse<PostBookingsData> =
        client.post(CustomerOperations.postBookings.path) { setBody(body) }.body()
}
