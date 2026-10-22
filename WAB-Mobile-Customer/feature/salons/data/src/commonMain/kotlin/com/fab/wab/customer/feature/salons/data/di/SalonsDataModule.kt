package com.fab.wab.customer.feature.salons.data.di

import com.fab.wab.customer.core.domain.salon.SalonSearchRepository
import com.fab.wab.customer.feature.salons.data.remote.SalonFiltersApi
import com.fab.wab.customer.feature.salons.data.remote.SalonSearchApi
import com.fab.wab.customer.feature.salons.data.repository.SalonFilterOptionsRepositoryImpl
import com.fab.wab.customer.feature.salons.data.repository.SalonSearchRepositoryImpl
import com.fab.wab.customer.feature.salons.domain.repository.SalonFilterOptionsRepository
import org.koin.dsl.module

val salonsDataModule = module {
    single { SalonSearchApi(get()) }
    single<SalonSearchRepository> { SalonSearchRepositoryImpl(get()) }
    single { SalonFiltersApi(get()) }
    single<SalonFilterOptionsRepository> { SalonFilterOptionsRepositoryImpl(get()) }
}
