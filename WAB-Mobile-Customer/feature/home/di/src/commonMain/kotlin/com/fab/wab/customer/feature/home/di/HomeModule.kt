package com.fab.wab.customer.feature.home.di

import com.fab.wab.customer.feature.home.data.di.homeDataModule
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.home.domain.usecase.LoadHomeUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val homeModule = module {
    includes(homeDataModule)
    singleOf(::LoadHomeUseCase)
    single { GetCurrentLocationUseCase(get()) }
}
