package com.fab.wab.customer.feature.salons.di

import com.fab.wab.customer.feature.salons.data.di.salonsDataModule
import com.fab.wab.customer.feature.salons.domain.usecase.LoadFilterServicesUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.LoadPriceBoundsUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSalonsUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSuggestionsUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val salonsModule = module {
    includes(salonsDataModule)
    singleOf(::SearchSalonsUseCase)
    singleOf(::LoadFilterServicesUseCase)
    singleOf(::LoadPriceBoundsUseCase)
    singleOf(::SearchSuggestionsUseCase)
}
