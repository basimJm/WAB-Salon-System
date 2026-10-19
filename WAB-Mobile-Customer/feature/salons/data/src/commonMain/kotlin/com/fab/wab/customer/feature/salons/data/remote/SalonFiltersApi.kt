package com.fab.wab.customer.feature.salons.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetSalonsFiltersData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class SalonFiltersApi(private val client: HttpClient) {
    suspend fun filters(gender: String, serviceIds: List<String>): BaseResponse<GetSalonsFiltersData> =
        client.get(CustomerOperations.getSalonsFilters.path) {
            parameter(QUERY_GENDER, gender)
            serviceIds.forEach { parameter(QUERY_SERVICE_IDS, it) }
        }.body()

    private companion object {
        const val QUERY_GENDER = "gender"
        const val QUERY_SERVICE_IDS = "serviceIds"
    }
}
