package com.fab.wab.customer.core.data.di

import com.fab.wab.customer.core.data.places.PlacesApiConfig
import com.fab.wab.customer.core.data.places.PlacesApiService
import com.fab.wab.customer.core.data.remote.AppSettingsApiService
import com.fab.wab.customer.core.data.remote.AppSettingsApiServiceImpl
import com.fab.wab.customer.core.data.repository.ApplicationSettingsRepositoryImpl
import com.fab.wab.customer.core.domain.repository.ApplicationSettingsRepository
import io.ktor.client.HttpClient
import org.koin.core.module.dsl.bind
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val dataModule = module {
    single { PlacesApiService(get<HttpClient>(), PlacesApiConfig.apiKey) }
    singleOf(::AppSettingsApiServiceImpl) { bind<AppSettingsApiService>() }
    singleOf(::ApplicationSettingsRepositoryImpl) { bind<ApplicationSettingsRepository>() }
}
