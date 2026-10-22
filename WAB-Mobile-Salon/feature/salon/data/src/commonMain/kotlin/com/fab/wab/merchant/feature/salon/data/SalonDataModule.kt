package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.feature.salon.domain.CatalogRequestsRepository
import com.fab.wab.merchant.feature.salon.domain.GalleryRepository
import com.fab.wab.merchant.feature.salon.domain.HoursRepository
import com.fab.wab.merchant.feature.salon.domain.SalonProfileRepository
import com.fab.wab.merchant.feature.salon.domain.ServicesRepository
import org.koin.dsl.module

/** Salon management data (MER-033…041); the hub reads the core salon source. */
val salonDataModule = module {
    single { SalonProfileApi(get()) }
    single<SalonProfileRepository> { SalonProfileRepositoryImpl(get(), get()) }
    single { GalleryApi(get()) }
    single<GalleryRepository> { GalleryRepositoryImpl(get()) }
    single { HoursApi(get()) }
    single<HoursRepository> { HoursRepositoryImpl(get(), get()) }
    single { ServicesApi(get()) }
    single<ServicesRepository> { ServicesRepositoryImpl(get(), get()) }
    single { CatalogRequestsApi(get()) }
    single<CatalogRequestsRepository> { CatalogRequestsRepositoryImpl(get()) }
}
