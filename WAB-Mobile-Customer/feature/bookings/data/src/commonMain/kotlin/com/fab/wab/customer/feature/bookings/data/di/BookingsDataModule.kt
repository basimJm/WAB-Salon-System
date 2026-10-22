package com.fab.wab.customer.feature.bookings.data.di

import com.fab.wab.customer.feature.bookings.data.remote.BookingsApi
import com.fab.wab.customer.feature.bookings.data.repository.BookingsRepositoryImpl
import com.fab.wab.customer.feature.bookings.domain.repository.BookingsRepository
import org.koin.dsl.module

val bookingsDataModule = module {
    single { BookingsApi(get()) }
    single<BookingsRepository> { BookingsRepositoryImpl(get()) }
}
