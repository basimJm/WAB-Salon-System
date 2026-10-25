package com.fab.wab.merchant.feature.application.di

import com.fab.wab.merchant.feature.application.data.di.applicationDataModule
import com.fab.wab.merchant.feature.application.domain.usecase.GetApplicationUseCase
import com.fab.wab.merchant.feature.application.domain.usecase.ResubmitApplicationUseCase
import com.fab.wab.merchant.feature.application.domain.usecase.SubmitApplicationUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val applicationModule = module {
    includes(applicationDataModule)
    singleOf(::SubmitApplicationUseCase)
    singleOf(::GetApplicationUseCase)
    singleOf(::ResubmitApplicationUseCase)
}
