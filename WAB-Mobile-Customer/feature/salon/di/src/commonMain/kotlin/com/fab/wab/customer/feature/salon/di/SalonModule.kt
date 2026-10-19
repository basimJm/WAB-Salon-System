package com.fab.wab.customer.feature.salon.di

import com.fab.wab.customer.feature.salon.data.di.salonDataModule
import com.fab.wab.customer.feature.salon.domain.usecase.GetSalonDetailsUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val salonModule = module {
    includes(salonDataModule)
    singleOf(::GetSalonDetailsUseCase)
}
