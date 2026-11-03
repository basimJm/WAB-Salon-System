package com.fab.wab.customer.feature.salons.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetSalonsDataItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsSuggestionsData
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonQuery
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class SalonSearchApi(private val client: HttpClient) {
    suspend fun search(query: SalonQuery): BaseResponse<List<GetSalonsDataItem>> =
        client.get(CustomerOperations.getSalons.path) { parameters(query.toParams()) }.body()

    suspend fun suggestions(text: String, filters: SalonFilters): BaseResponse<GetSalonsSuggestionsData> =
        client.get(CustomerOperations.getSalonsSuggestions.path) {
            parameter(SalonQueryKeys.TEXT, text)
            parameters(filters.scopeParams())
        }.body()
}

internal fun HttpRequestBuilder.parameters(params: List<Pair<String, String>>) = params.forEach { (key, value) -> parameter(key, value) }
