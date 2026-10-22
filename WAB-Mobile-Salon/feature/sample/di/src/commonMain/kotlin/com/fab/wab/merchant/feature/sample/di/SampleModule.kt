package com.fab.wab.merchant.feature.sample.di

import com.fab.wab.merchant.feature.sample.data.di.sampleDataModule
import com.fab.wab.merchant.feature.sample.domain.usecase.GetSampleItemsUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val sampleModule = module {
    includes(sampleDataModule)
    singleOf(::GetSampleItemsUseCase)
}
