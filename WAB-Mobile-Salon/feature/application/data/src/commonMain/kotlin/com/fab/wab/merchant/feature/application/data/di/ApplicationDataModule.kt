package com.fab.wab.merchant.feature.application.data.di

import com.fab.wab.merchant.feature.application.data.remote.ApplicationApi
import com.fab.wab.merchant.feature.application.data.repository.ApplicationRepositoryImpl
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationRepository
import org.koin.dsl.module

val applicationDataModule = module {
    single { ApplicationApi(get()) }
    single<ApplicationRepository> { ApplicationRepositoryImpl(get()) }
}
