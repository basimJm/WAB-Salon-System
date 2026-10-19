package com.fab.wab.customer.core.network.client

import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.network.config.ApiConfig
import io.ktor.client.HttpClient

expect fun createHttpClient(
    apiConfig: ApiConfig,
    appSettings: AppSettings,
    sessionTimeOut: SessionTimeOut,
    engineProvider: HttpEngineProvider,
): HttpClient
