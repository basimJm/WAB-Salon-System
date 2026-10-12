package com.fab.wab.customer.core.network.di

import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.network.client.createHttpClient
import com.fab.wab.customer.core.network.config.ApiConfig
import com.fab.wab.customer.core.network.config.getApiBaseUrl
import com.fab.wab.customer.core.network.config.getAuthToken
import com.fab.wab.customer.core.network.config.isDebugBuild
import org.koin.dsl.module

val networkModule = module {
    single {
        ApiConfig(
            baseUrl = getApiBaseUrl(),
            authToken = getAuthToken(),
            isDebug = isDebugBuild(),
        )
    }
    single { createHttpClient(get(), get<AppSettings>(), get<SessionTimeOut>()) }
}
