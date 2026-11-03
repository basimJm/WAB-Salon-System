package com.fab.wab.customer.core.data.di

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.data.config.AppConfigApi
import com.fab.wab.customer.core.data.config.AppConfigRepositoryImpl
import com.fab.wab.customer.core.data.catalog.CatalogApi
import com.fab.wab.customer.core.data.catalog.CatalogRepositoryImpl
import com.fab.wab.customer.core.data.favorites.FavoritesApi
import com.fab.wab.customer.core.domain.catalog.CatalogRepository
import com.fab.wab.customer.core.data.favorites.FavoritesRepositoryImpl
import com.fab.wab.customer.core.data.locations.LocationsApi
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.data.locations.LocationsRepositoryImpl
import com.fab.wab.customer.core.data.places.PlacesApiConfig
import com.fab.wab.customer.core.data.places.PlacesApiService
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.config.AppConfigRepository
import com.fab.wab.customer.core.domain.config.ClientPlatform
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.core.data.upload.UploadsApi
import com.fab.wab.customer.core.data.upload.UploadsRepositoryImpl
import com.fab.wab.customer.core.domain.upload.UploadsRepository
import com.fab.wab.customer.core.network.client.HttpEngineProvider
import io.ktor.client.HttpClient
import org.koin.core.qualifier.named
import org.koin.dsl.module

/** The storage client shares the platform engine (fixture engine in mock builds) but none of the WAB plugins. */
const val STORAGE_CLIENT = "storageClient"

/** The app binds [ClientPlatform]; the environment carries the installed version the config call reports. */
val dataModule = module {
    single { PlacesApiService(get<HttpClient>(), PlacesApiConfig.apiKey) }
    single { AppConfigApi(client = get(), platform = get<ClientPlatform>(), appVersion = get<AppEnvironment>().appVersion) }
    single<AppConfigRepository> { AppConfigRepositoryImpl(get()) }
    single { LocationsApi(get()) }
    single { FavoritesApi(get()) }
    single { CatalogApi(get()) }
    single<CatalogRepository> { CatalogRepositoryImpl(get()) }
    single<FavoritesRepository> { FavoritesRepositoryImpl(get()) }
    single(named(STORAGE_CLIENT)) { HttpClient(get<HttpEngineProvider>().create()) }
    single { UploadsApi(get(), get(named(STORAGE_CLIENT))) }
    single<UploadsRepository> { UploadsRepositoryImpl(get()) }
    single<LocationsRepository> { LocationsRepositoryImpl(api = get(), language = get<AppSettings>().language) }
}
