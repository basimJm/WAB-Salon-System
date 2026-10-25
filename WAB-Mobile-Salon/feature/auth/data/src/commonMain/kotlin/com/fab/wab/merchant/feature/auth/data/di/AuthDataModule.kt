package com.fab.wab.merchant.feature.auth.data.di

import com.fab.wab.merchant.feature.auth.data.remote.AuthApi
import com.fab.wab.merchant.feature.auth.data.remote.InstallationsApi
import com.fab.wab.merchant.feature.auth.data.repository.AuthRepositoryImpl
import com.fab.wab.merchant.feature.auth.data.repository.InstallationsRepositoryImpl
import com.fab.wab.merchant.feature.auth.domain.repository.AuthRepository
import com.fab.wab.merchant.feature.auth.domain.repository.InstallationsRepository
import org.koin.dsl.module

val authDataModule = module {
    single { AuthApi(get()) }
    single<AuthRepository> { AuthRepositoryImpl(get()) }
    single { InstallationsApi(get()) }
    single<InstallationsRepository> { InstallationsRepositoryImpl(get()) }
}
