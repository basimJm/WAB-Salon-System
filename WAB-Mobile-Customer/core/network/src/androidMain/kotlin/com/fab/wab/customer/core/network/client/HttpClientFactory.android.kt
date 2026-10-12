package com.fab.wab.customer.core.network.client

import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.network.config.ApiConfig
import io.ktor.client.HttpClient

actual fun createHttpClient(
    apiConfig: ApiConfig,
    appSettings: AppSettings,
    sessionTimeOut: SessionTimeOut
): HttpClient {
    return BaseHttpClient(apiConfig, appSettings,sessionTimeOut).buildHttpClient()
}
