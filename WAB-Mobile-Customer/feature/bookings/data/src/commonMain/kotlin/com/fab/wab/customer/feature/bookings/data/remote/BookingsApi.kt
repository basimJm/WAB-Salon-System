package com.fab.wab.customer.feature.bookings.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetBookingsDataItem
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class BookingsApi(private val client: HttpClient) {
    suspend fun list(tab: String, query: String, page: Int, pageSize: Int): BaseResponse<List<GetBookingsDataItem>> =
        client.get(CustomerOperations.getBookings.path) {
            parameter(QUERY_PAGE, page)
            parameter(QUERY_PAGE_SIZE, pageSize)
            parameter(QUERY_TAB, tab)
            query.takeIf { it.isNotBlank() }?.let { parameter(QUERY_TEXT, it) }
        }.body()

    private companion object {
        const val QUERY_PAGE = "page"
        const val QUERY_PAGE_SIZE = "pageSize"
        const val QUERY_TAB = "tab"
        const val QUERY_TEXT = "q"
    }
}
