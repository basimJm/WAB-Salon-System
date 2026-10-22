package com.fab.wab.merchant.core.di

import com.fab.wab.merchant.core.data.di.dataModule
import com.fab.wab.merchant.core.data.upload.uploadModule
import com.fab.wab.merchant.core.data.places.PlacesRepositoryImpl
import com.fab.wab.merchant.core.data.repository.LocalCacheRepositoryImpl
import com.fab.wab.merchant.core.data.repository.SessionTimeOutImpl
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.repository.LocalCacheRepository
import com.fab.wab.merchant.core.domain.repository.PlacesRepository
import com.fab.wab.merchant.core.domain.repository.SessionTimeOut
import com.fab.wab.merchant.core.network.di.networkModule
import com.fab.wab.merchant.core.storage.di.storageModule
import com.fab.wab.merchant.core.ui.external.externalActionsModule
import com.fab.wab.merchant.core.ui.alert.requestAlertModule
import com.fab.wab.merchant.core.ui.map.mapModule
import com.fab.wab.merchant.core.ui.permission.permissionModule
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
    includes(
        storageModule,
        dataModule,
        uploadModule,
        networkModule,
        deviceLocationProviderModule,
        permissionModule,
        externalActionsModule,
        requestAlertModule,
        mapModule,
    )
}
