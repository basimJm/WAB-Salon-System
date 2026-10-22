package com.fab.wab.merchant.core.network.client

import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.repository.SessionTimeOut
import com.fab.wab.merchant.core.network.config.ApiConfig
import io.ktor.client.HttpClient

expect fun createHttpClient(
    apiConfig: ApiConfig,
    appSettings: AppSettings,
    sessionTimeOut: SessionTimeOut,
    engineProvider: HttpEngineProvider,
): HttpClient
