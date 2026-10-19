package com.fab.wab.customer.core.data.config

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.GetConfigData
import com.fab.wab.customer.core.domain.config.ClientPlatform
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

private const val PARAM_PLATFORM = "platform"
private const val PARAM_VERSION = "version"

/** `GET /customer/v1/config?platform&version` (public; the version decides the update status server-side). */
class AppConfigApi(
    private val client: HttpClient,
    private val platform: ClientPlatform,
    private val appVersion: String,
) {
    suspend fun getConfig(): BaseResponse<GetConfigData> =
        client.get(CustomerOperations.getConfig.path) {
            parameter(PARAM_PLATFORM, platform.code)
            parameter(PARAM_VERSION, appVersion)
        }.body()
}
