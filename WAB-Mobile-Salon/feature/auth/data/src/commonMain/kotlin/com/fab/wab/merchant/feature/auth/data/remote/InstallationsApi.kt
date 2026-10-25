package com.fab.wab.merchant.feature.auth.data.remote

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.PutInstallationsBody
import com.fab.wab.merchant.core.data.contract.generated.PutInstallationsData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.put
import io.ktor.client.request.setBody

class InstallationsApi(private val client: HttpClient) {
    suspend fun register(body: PutInstallationsBody): BaseResponse<PutInstallationsData> =
        client.put(MerchantOperations.putInstallations.path) { setBody(body) }.body()
}
