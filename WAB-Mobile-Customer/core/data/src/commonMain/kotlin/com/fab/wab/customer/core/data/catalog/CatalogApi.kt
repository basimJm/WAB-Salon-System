package com.fab.wab.customer.core.data.catalog

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetCatalogServicesDataItem
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class CatalogApi(private val client: HttpClient) {
    suspend fun services(gender: String?, businessType: String?, page: Int, pageSize: Int): BaseResponse<List<GetCatalogServicesDataItem>> =
        client.get(CustomerOperations.getCatalogServices.path) {
            parameter(QUERY_PAGE, page)
            parameter(QUERY_PAGE_SIZE, pageSize)
            gender?.let { parameter(QUERY_GENDER, it) }
            businessType?.let { parameter(QUERY_BUSINESS_TYPE, it) }
        }.body()

    private companion object {
        const val QUERY_PAGE = "page"
        const val QUERY_PAGE_SIZE = "pageSize"
        const val QUERY_GENDER = "gender"
        const val QUERY_BUSINESS_TYPE = "businessType"
    }
}
