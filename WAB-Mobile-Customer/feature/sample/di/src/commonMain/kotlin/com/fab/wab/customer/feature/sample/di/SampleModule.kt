package com.fab.wab.customer.feature.sample.di

import com.fab.wab.customer.feature.sample.data.di.sampleDataModule
import com.fab.wab.customer.feature.sample.domain.usecase.GetSampleItemsUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val sampleModule = module {
    includes(sampleDataModule)
    singleOf(::GetSampleItemsUseCase)
}
