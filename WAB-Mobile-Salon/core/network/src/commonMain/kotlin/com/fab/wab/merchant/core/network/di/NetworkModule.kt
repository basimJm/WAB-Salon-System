package com.fab.wab.merchant.core.network.di

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.auth.SessionRefresher
import com.fab.wab.merchant.core.domain.repository.SessionTimeOut
import com.fab.wab.merchant.core.network.client.BaseHttpClient
import com.fab.wab.merchant.core.network.client.HttpEngineProvider
import com.fab.wab.merchant.core.network.config.ApiConfig
import com.fab.wab.merchant.core.network.config.getAuthToken
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
    single { BaseHttpClient(get(), get<AppSettings>(), get<SessionTimeOut>(), get<HttpEngineProvider>()) }
    single { get<BaseHttpClient>().buildHttpClient() }
    single<SessionRefresher> { get<BaseHttpClient>().refresher }
}
