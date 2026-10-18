package com.fab.wab.customer.feature.auth.data.di

import com.fab.wab.customer.feature.auth.data.remote.AuthApi
import com.fab.wab.customer.feature.auth.data.repository.AuthRepositoryImpl
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import org.koin.dsl.module

val authDataModule = module {
    single { AuthApi(get()) }
    single<AuthRepository> { AuthRepositoryImpl(get()) }
}
