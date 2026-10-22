package com.fab.wab.merchant.core.network.di

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.repository.SessionTimeOut
import com.fab.wab.merchant.core.network.client.createHttpClient
import com.fab.wab.merchant.core.network.config.ApiConfig
import com.fab.wab.merchant.core.network.config.getAuthToken
import com.fab.wab.merchant.core.network.client.HttpEngineProvider
import org.koin.dsl.module

val networkModule = module {
    single {
        val environment = get<AppEnvironment>()
        ApiConfig(
            baseUrl = environment.apiBaseUrl,
            authToken = getAuthToken(),
            isDebug = environment.isDebug,
        )
    }
    single { createHttpClient(get(), get<AppSettings>(), get<SessionTimeOut>(), get<HttpEngineProvider>()) }
}
