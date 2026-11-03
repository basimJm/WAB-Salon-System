package com.fab.wab.merchant.feature.bookings.data.remote

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetCustomersLookupData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsBody
import com.fab.wab.merchant.core.data.contract.generated.PostBookingsData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody

/** Query names of `GET /customers/lookup` (contract). */
internal object LookupParams {
    const val COUNTRY_CODE = "countryCode"
    const val NUMBER = "number"
}

/** BUSINESS_DOMAIN §5.20: lookup, the salon's services and `POST /bookings`. */
class NewBookingApi(private val client: HttpClient) {
    suspend fun lookup(countryCode: String, number: String): BaseResponse<GetCustomersLookupData> =
        client.get(MerchantOperations.getCustomersLookup.path) {
            parameter(LookupParams.COUNTRY_CODE, countryCode)
            parameter(LookupParams.NUMBER, number)
        }.body()

    suspend fun services(page: Int, pageSize: Int): BaseResponse<List<GetSalonServicesDataItem>> =
        client.get(MerchantOperations.getSalonServices.path) {
            parameter(BookingsParams.PAGE, page)
            parameter(BookingsParams.PAGE_SIZE, pageSize)
        }.body()

    suspend fun create(body: PostBookingsBody): BaseResponse<PostBookingsData> =
        client.post(MerchantOperations.postBookings.path) { setBody(body) }.body()
}
