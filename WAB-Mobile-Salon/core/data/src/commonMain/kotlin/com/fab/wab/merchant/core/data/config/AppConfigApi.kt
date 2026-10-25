package com.fab.wab.merchant.core.data.config

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.contract.generated.GetConfigData
import com.fab.wab.merchant.core.domain.config.ClientPlatform
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

private const val PARAM_PLATFORM = "platform"
private const val PARAM_VERSION = "version"

/** `GET /merchant/v1/config?platform&version` (public; the version decides the update status server-side). */
class AppConfigApi(
    private val client: HttpClient,
    private val platform: ClientPlatform,
    private val appVersion: String,
) {
    suspend fun getConfig(): BaseResponse<GetConfigData> =
        client.get(MerchantOperations.getConfig.path) {
            parameter(PARAM_PLATFORM, platform.code)
            parameter(PARAM_VERSION, appVersion)
        }.body()
}
