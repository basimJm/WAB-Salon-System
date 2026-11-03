package com.fab.wab.customer.feature.home.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class HomeApi(private val client: HttpClient) {
    /** `businessType` null = every type (the lens "All"); the gender only selects the banners (BUSINESS_DOMAIN §5.22). */
    suspend fun home(gender: String, businessType: String?, lat: Double?, lng: Double?): BaseResponse<GetHomeData> =
        client.get(CustomerOperations.getHome.path) {
            parameter(QUERY_GENDER, gender)
            businessType?.let { parameter(QUERY_BUSINESS_TYPE, it) }
            lat?.let { parameter(QUERY_LAT, it) }
            lng?.let { parameter(QUERY_LNG, it) }
        }.body()

    private companion object {
        const val QUERY_GENDER = "gender"
        const val QUERY_BUSINESS_TYPE = "businessType"
        const val QUERY_LAT = "lat"
        const val QUERY_LNG = "lng"
    }
}
