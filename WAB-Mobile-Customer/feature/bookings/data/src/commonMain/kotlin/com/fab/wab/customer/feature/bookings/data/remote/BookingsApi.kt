package com.fab.wab.customer.feature.bookings.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.customer.core.data.contract.generated.PostBookingsByIdCancelBody
import com.fab.wab.customer.core.data.contract.generated.PostBookingsByIdCancelData
import com.fab.wab.customer.core.data.contract.pathWith
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody

class BookingsApi(private val client: HttpClient) {
    suspend fun list(
        tab: String,
        query: String,
        page: Int,
        pageSize: Int,
        businessType: String? = null,
    ): BaseResponse<List<GetBookingsDataItem>> =
        client.get(CustomerOperations.getBookings.path) {
            parameter(QUERY_PAGE, page)
            parameter(QUERY_PAGE_SIZE, pageSize)
            parameter(QUERY_TAB, tab)
            query.takeIf { it.isNotBlank() }?.let { parameter(QUERY_TEXT, it) }
            businessType?.let { parameter(QUERY_BUSINESS_TYPE, it) }
        }.body()

    suspend fun details(bookingId: String): BaseResponse<GetBookingsByIdData> {
        val op = CustomerOperations.getBookingsById
        return client.get(op.pathWith(op.pathParams.single() to bookingId)).body()
    }

    suspend fun cancel(bookingId: String, body: PostBookingsByIdCancelBody): BaseResponse<PostBookingsByIdCancelData> {
        val op = CustomerOperations.postBookingsByIdCancel
        return client.post(op.pathWith(op.pathParams.single() to bookingId)) { setBody(body) }.body()
    }

    private companion object {
        const val QUERY_PAGE = "page"
        const val QUERY_PAGE_SIZE = "pageSize"
        const val QUERY_TAB = "tab"
        const val QUERY_TEXT = "q"
        const val QUERY_BUSINESS_TYPE = "businessType"
    }
}
