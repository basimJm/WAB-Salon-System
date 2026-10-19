package com.fab.wab.customer.feature.salons.data.di

import com.fab.wab.customer.core.domain.salon.SalonSearchRepository
import com.fab.wab.customer.feature.salons.data.remote.SalonSearchApi
import com.fab.wab.customer.feature.salons.data.repository.SalonSearchRepositoryImpl
import org.koin.dsl.module

val salonsDataModule = module {
    single { SalonSearchApi(get()) }
    single<SalonSearchRepository> { SalonSearchRepositoryImpl(get()) }
}
