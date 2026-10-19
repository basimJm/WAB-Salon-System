package com.fab.wab.customer.feature.auth.data.remote

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.PatchInstallationsPushEnabledBody
import com.fab.wab.customer.core.data.contract.generated.PutInstallationsBody
import com.fab.wab.customer.core.data.contract.generated.PutInstallationsData
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.patch
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import kotlinx.serialization.json.JsonElement

class InstallationsApi(private val client: HttpClient) {
    suspend fun register(body: PutInstallationsBody): BaseResponse<PutInstallationsData> =
        client.put(CustomerOperations.putInstallations.path) { setBody(body) }.body()

    suspend fun setPushEnabled(body: PatchInstallationsPushEnabledBody): BaseResponse<JsonElement?> =
        client.patch(CustomerOperations.patchInstallationsPushEnabled.path) { setBody(body) }.body()
}
