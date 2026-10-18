package com.fab.wab.customer.feature.auth.di

import com.fab.wab.customer.feature.auth.data.di.authDataModule
import com.fab.wab.customer.feature.auth.domain.usecase.CheckPhoneUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val authModule = module {
    includes(authDataModule)
    singleOf(::CheckPhoneUseCase)
}
