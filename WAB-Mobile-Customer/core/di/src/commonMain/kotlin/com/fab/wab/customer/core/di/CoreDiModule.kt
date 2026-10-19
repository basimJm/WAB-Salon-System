package com.fab.wab.customer.core.di

import com.fab.wab.customer.core.data.di.dataModule
import com.fab.wab.customer.core.data.places.PlacesRepositoryImpl
import com.fab.wab.customer.core.data.repository.LocalCacheRepositoryImpl
import com.fab.wab.customer.core.data.repository.SessionTimeOutImpl
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.repository.LocalCacheRepository
import com.fab.wab.customer.core.domain.repository.PlacesRepository
import com.fab.wab.customer.core.domain.repository.SessionTimeOut
import com.fab.wab.customer.core.network.di.networkModule
import com.fab.wab.customer.core.storage.di.storageModule
import com.fab.wab.customer.core.ui.external.externalActionsModule
import com.fab.wab.customer.core.ui.permission.permissionModule
import org.koin.core.module.Module
import org.koin.core.module.dsl.bind
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

expect val deviceLocationProviderModule: Module

val coreDiModule = module {
    singleOf(::LocalCacheRepositoryImpl) { bind<LocalCacheRepository>() }
    singleOf(::PlacesRepositoryImpl) { bind<PlacesRepository>() }
    singleOf(::SessionTimeOutImpl) { bind<SessionTimeOut>() }
    singleOf(::AppearanceSettings)
    includes(storageModule, dataModule, networkModule, deviceLocationProviderModule, permissionModule, externalActionsModule)
}
