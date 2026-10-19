package com.fab.wab.customer.feature.content.di

import com.fab.wab.customer.feature.content.data.di.contentDataModule
import com.fab.wab.customer.feature.content.domain.usecase.LoadContentPageUseCase
import com.fab.wab.customer.feature.content.domain.usecase.LoadFaqsUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val contentModule = module {
    includes(contentDataModule)
    singleOf(::LoadContentPageUseCase)
    singleOf(::LoadFaqsUseCase)
}
