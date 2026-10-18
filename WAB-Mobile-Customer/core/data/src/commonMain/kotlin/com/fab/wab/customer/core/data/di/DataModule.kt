package com.fab.wab.customer.core.data.di

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.data.config.AppConfigApi
import com.fab.wab.customer.core.data.config.AppConfigRepositoryImpl
import com.fab.wab.customer.core.data.places.PlacesApiConfig
import com.fab.wab.customer.core.data.places.PlacesApiService
import com.fab.wab.customer.core.domain.config.AppConfigRepository
import com.fab.wab.customer.core.domain.config.ClientPlatform
import io.ktor.client.HttpClient
import org.koin.dsl.module

/** The app binds [ClientPlatform]; the environment carries the installed version the config call reports. */
val dataModule = module {
    single { PlacesApiService(get<HttpClient>(), PlacesApiConfig.apiKey) }
    single { AppConfigApi(client = get(), platform = get<ClientPlatform>(), appVersion = get<AppEnvironment>().appVersion) }
    single<AppConfigRepository> { AppConfigRepositoryImpl(get()) }
}
