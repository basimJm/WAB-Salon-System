package com.fab.wab.customer.feature.home.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class HomeApi(private val client: HttpClient) {
    suspend fun home(gender: String, lat: Double?, lng: Double?): BaseResponse<GetHomeData> =
        client.get(CustomerOperations.getHome.path) {
            parameter(QUERY_GENDER, gender)
            lat?.let { parameter(QUERY_LAT, it) }
            lng?.let { parameter(QUERY_LNG, it) }
        }.body()

    private companion object {
        const val QUERY_GENDER = "gender"
        const val QUERY_LAT = "lat"
        const val QUERY_LNG = "lng"
    }
}
