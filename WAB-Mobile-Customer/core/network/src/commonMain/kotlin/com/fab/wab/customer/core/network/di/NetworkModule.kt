package com.fab.wab.customer.core.network.di

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.network.client.createHttpClient
import com.fab.wab.customer.core.network.config.ApiConfig
import com.fab.wab.customer.core.network.config.getAuthToken
import com.fab.wab.customer.core.network.client.HttpEngineProvider
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
