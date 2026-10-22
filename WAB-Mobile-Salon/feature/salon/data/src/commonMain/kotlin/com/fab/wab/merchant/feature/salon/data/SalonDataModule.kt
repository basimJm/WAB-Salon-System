package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.feature.salon.domain.SalonProfileRepository
import org.koin.dsl.module

/** Salon management data (MER-033…041); the hub reads the core salon source. */
val salonDataModule = module {
    single { SalonProfileApi(get()) }
    single<SalonProfileRepository> { SalonProfileRepositoryImpl(get(), get()) }
}
