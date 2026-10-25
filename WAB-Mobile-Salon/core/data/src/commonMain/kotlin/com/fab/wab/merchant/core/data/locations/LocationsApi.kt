package com.fab.wab.merchant.core.data.locations

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.GetLocationsAreasDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetLocationsCitiesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetLocationsCountriesDataItem
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

private const val PARAM_COUNTRY_CODE = "countryCode"
private const val PARAM_CITY_ID = "cityId"

/** `GET /merchant/v1/locations/{countries,cities,areas}`; the client's Accept-Language picks the names' language. */
class LocationsApi(private val client: HttpClient) {

    suspend fun countries(): BaseResponse<List<GetLocationsCountriesDataItem>> =
        client.get(MerchantOperations.getLocationsCountries.path).body()

    suspend fun cities(countryCode: String): BaseResponse<List<GetLocationsCitiesDataItem>> =
        client.get(MerchantOperations.getLocationsCities.path) { parameter(PARAM_COUNTRY_CODE, countryCode) }.body()

    suspend fun areas(cityId: String): BaseResponse<List<GetLocationsAreasDataItem>> =
        client.get(MerchantOperations.getLocationsAreas.path) { parameter(PARAM_CITY_ID, cityId) }.body()
}
