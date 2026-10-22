package com.fab.wab.merchant.core.data.di

import com.fab.wab.merchant.core.data.booking.AffectedBookingsApi
import com.fab.wab.merchant.core.data.booking.AffectedBookingsRepositoryImpl
import com.fab.wab.merchant.core.domain.booking.AffectedBookingsRepository
import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.data.config.AppConfigApi
import com.fab.wab.merchant.core.data.config.AppConfigRepositoryImpl
import com.fab.wab.merchant.core.data.locations.LocationsApi
import com.fab.wab.merchant.core.data.locations.LocationsRepositoryImpl
import com.fab.wab.merchant.core.data.places.PlacesApiConfig
import com.fab.wab.merchant.core.data.salon.SalonApi
import com.fab.wab.merchant.core.data.salon.SalonRepositoryImpl
import com.fab.wab.merchant.core.data.places.PlacesApiService
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.config.ClientPlatform
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import io.ktor.client.HttpClient
import org.koin.dsl.module

/**
 * Shared data services; feature repositories live in their own `feature/<name>/data` modules. The app binds
 * [ClientPlatform]; the environment carries the installed version the config call reports.
 */
val dataModule = module {
    single { AppConfigApi(client = get(), platform = get<ClientPlatform>(), appVersion = get<AppEnvironment>().appVersion) }
    single<AppConfigRepository> { AppConfigRepositoryImpl(get()) }
    single { LocationsApi(get()) }
    single<LocationsRepository> { LocationsRepositoryImpl(api = get(), language = get<AppSettings>().language) }
    single { PlacesApiService(get<HttpClient>(), PlacesApiConfig.apiKey) }
    single { PermissionsSync(refresher = get(), sessionStore = get()) }
    single { SalonApi(get()) }
    single { AffectedBookingsApi(get()) }
    single<AffectedBookingsRepository> { AffectedBookingsRepositoryImpl(get()) }
    single<SalonRepository> { SalonRepositoryImpl(api = get(), sessionStore = get()) }
}
