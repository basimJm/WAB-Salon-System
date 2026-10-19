package com.fab.wab.customer.feature.profile.data.di

import com.fab.wab.customer.core.network.client.HttpEngineProvider
import com.fab.wab.customer.feature.profile.data.remote.ProfileApi
import com.fab.wab.customer.feature.profile.data.remote.UploadsApi
import com.fab.wab.customer.feature.profile.data.repository.ProfileRepositoryImpl
import com.fab.wab.customer.feature.profile.data.repository.UploadsRepositoryImpl
import com.fab.wab.customer.feature.profile.domain.repository.ProfileRepository
import com.fab.wab.customer.feature.profile.domain.repository.UploadsRepository
import io.ktor.client.HttpClient
import org.koin.core.qualifier.named
import org.koin.dsl.module

/** The storage client shares the platform engine (fixture engine in mock builds) but none of the WAB plugins. */
const val STORAGE_CLIENT = "storageClient"

val profileDataModule = module {
    single(named(STORAGE_CLIENT)) { HttpClient(get<HttpEngineProvider>().create()) }
    single { ProfileApi(get()) }
    single { UploadsApi(get(), get(named(STORAGE_CLIENT))) }
    single<ProfileRepository> { ProfileRepositoryImpl(get()) }
    single<UploadsRepository> { UploadsRepositoryImpl(get()) }
}
