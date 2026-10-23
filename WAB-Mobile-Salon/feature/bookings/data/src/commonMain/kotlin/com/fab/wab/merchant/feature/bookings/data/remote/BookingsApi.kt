package com.fab.wab.merchant.feature.bookings.data.remote

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsByIdData
import com.fab.wab.merchant.core.data.contract.generated.GetBookingsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsByIdCancelBody
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsByIdReassignBody
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsByIdRejectBody
import com.fab.wab.merchant.core.data.contract.pathWith
import com.fab.wab.merchant.feature.bookings.domain.model.BookingQuery
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement

private const val ID = "id"

/** Query names of `GET /bookings` (contract). */
internal object BookingsParams {
    const val PAGE = "page"
    const val PAGE_SIZE = "pageSize"
    const val TAB = "tab"
    const val Q = "q"
    const val FROM = "from"
    const val TO = "to"
    const val STAFF_ID = "staffId"
    const val STATUS = "status"
    const val BRIDE_ONLY = "brideOnly"
    const val PAYMENT_STATUS = "paymentStatus"
}

class BookingsApi(private val client: HttpClient) {
    suspend fun list(query: BookingQuery, page: Int, pageSize: Int): BaseResponse<List<GetBookingsDataItem>> =
        client.get(MerchantOperations.getBookings.path) { queryOf(query, page, pageSize) }.body()

    suspend fun details(id: String): BaseResponse<GetBookingsByIdData> =
        client.get(MerchantOperations.getBookingsById.pathWith(ID to id)).body()

    suspend fun approve(id: String): BaseResponse<JsonElement?> = client.post(
        MerchantOperations.postBookingsByIdApprove.pathWith(ID to id),
    ).body()

    suspend fun reject(id: String, body: PostBookingsByIdRejectBody): BaseResponse<JsonElement?> =
        client.post(MerchantOperations.postBookingsByIdReject.pathWith(ID to id)) { setBody(body) }.body()

    suspend fun cancel(id: String, body: PostBookingsByIdCancelBody): BaseResponse<JsonElement?> =
        client.post(MerchantOperations.postBookingsByIdCancel.pathWith(ID to id)) { setBody(body) }.body()

    suspend fun complete(id: String): BaseResponse<JsonElement?> = client.post(
        MerchantOperations.postBookingsByIdComplete.pathWith(ID to id),
    ).body()

    suspend fun noShow(id: String): BaseResponse<JsonElement?> = client.post(
        MerchantOperations.postBookingsByIdNoShow.pathWith(ID to id),
    ).body()

    suspend fun reassign(id: String, body: PostBookingsByIdReassignBody): BaseResponse<JsonElement?> =
        client.post(MerchantOperations.postBookingsByIdReassign.pathWith(ID to id)) { setBody(body) }.body()

    suspend fun team(): BaseResponse<List<GetTeamMembersDataItem>> = client.get(MerchantOperations.getTeamMembers.path).body()
}

private fun HttpRequestBuilder.queryOf(query: BookingQuery, page: Int, pageSize: Int) {
    val filter = query.filter
    parameter(BookingsParams.PAGE, page)
    parameter(BookingsParams.PAGE_SIZE, pageSize)
    parameter(BookingsParams.TAB, query.tab.name)
    query.text.trim().takeIf { it.isNotEmpty() }?.let { parameter(BookingsParams.Q, it) }
    filter.from?.let { parameter(BookingsParams.FROM, it.toString()) }
    filter.to?.let { parameter(BookingsParams.TO, it.toString()) }
    filter.staffIds.forEach { parameter(BookingsParams.STAFF_ID, it) }
    filter.statuses.forEach { parameter(BookingsParams.STATUS, it.name) }
    if (filter.brideOnly) parameter(BookingsParams.BRIDE_ONLY, true)
    filter.paymentStatus?.let { parameter(BookingsParams.PAYMENT_STATUS, it.name) }
}
