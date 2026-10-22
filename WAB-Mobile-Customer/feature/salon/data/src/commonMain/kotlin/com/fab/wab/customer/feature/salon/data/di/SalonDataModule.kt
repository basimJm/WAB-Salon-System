package com.fab.wab.customer.feature.salon.data.di

import com.fab.wab.customer.feature.salon.data.remote.ReviewsApi
import com.fab.wab.customer.feature.salon.data.remote.SalonDetailsApi
import com.fab.wab.customer.feature.salon.data.repository.ReviewsRepositoryImpl
import com.fab.wab.customer.feature.salon.data.repository.SalonDetailsRepositoryImpl
import com.fab.wab.customer.feature.salon.domain.repository.ReviewsRepository
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import org.koin.dsl.module

val salonDataModule = module {
    single { SalonDetailsApi(get()) }
    single<SalonDetailsRepository> { SalonDetailsRepositoryImpl(get()) }
    single { ReviewsApi(get()) }
    single<ReviewsRepository> { ReviewsRepositoryImpl(get()) }
}
