package com.fab.wab.customer.feature.salons.di

import com.fab.wab.customer.feature.salons.data.di.salonsDataModule
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSalonsUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val salonsModule = module {
    includes(salonsDataModule)
    singleOf(::SearchSalonsUseCase)
}
