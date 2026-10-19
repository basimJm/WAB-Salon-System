package com.fab.wab.customer.feature.salon.data.di

import com.fab.wab.customer.feature.salon.data.remote.SalonDetailsApi
import com.fab.wab.customer.feature.salon.data.repository.SalonDetailsRepositoryImpl
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import org.koin.dsl.module

val salonDataModule = module {
    single { SalonDetailsApi(get()) }
    single<SalonDetailsRepository> { SalonDetailsRepositoryImpl(get()) }
}
