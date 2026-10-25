package com.fab.wab.merchant.core.data.salon

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetSalonData
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class SalonApi(private val client: HttpClient) {
    suspend fun current(): BaseResponse<GetSalonData> = client.get(MerchantOperations.getSalon.path).body()
}
