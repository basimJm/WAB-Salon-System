package com.fab.wab.customer.feature.home.data.di

import com.fab.wab.customer.feature.home.data.remote.HomeApi
import com.fab.wab.customer.feature.home.data.repository.HomeRepositoryImpl
import com.fab.wab.customer.feature.home.domain.repository.HomeRepository
import org.koin.dsl.module

val homeDataModule = module {
    single { HomeApi(get()) }
    single<HomeRepository> { HomeRepositoryImpl(get()) }
}
