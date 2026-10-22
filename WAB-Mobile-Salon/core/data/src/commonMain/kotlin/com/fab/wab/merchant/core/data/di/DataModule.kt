package com.fab.wab.merchant.core.data.di

import com.fab.wab.merchant.core.data.places.PlacesApiConfig
import com.fab.wab.merchant.core.data.places.PlacesApiService
import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import io.ktor.client.HttpClient
import org.koin.dsl.module

/** Shared data services; feature repositories live in their own `feature/<name>/data` modules. */
val dataModule = module {
    single { PlacesApiService(get<HttpClient>(), PlacesApiConfig.apiKey) }
    single { PermissionsSync(refresher = get(), sessionStore = get()) }
}
