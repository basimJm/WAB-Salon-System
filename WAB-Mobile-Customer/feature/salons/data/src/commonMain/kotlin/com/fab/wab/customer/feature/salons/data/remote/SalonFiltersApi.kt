package com.fab.wab.customer.feature.salons.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetSalonsFiltersData
import com.fab.wab.customer.core.domain.salon.SalonFilters
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class SalonFiltersApi(private val client: HttpClient) {
    suspend fun filters(filters: SalonFilters): BaseResponse<GetSalonsFiltersData> =
        client.get(CustomerOperations.getSalonsFilters.path) { parameters(filters.priceBoundsParams()) }.body()
}
