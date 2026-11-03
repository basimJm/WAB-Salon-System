package com.fab.wab.merchant.feature.bookings.data.di

import com.fab.wab.merchant.feature.bookings.data.remote.BookingsApi
import com.fab.wab.merchant.feature.bookings.data.remote.CalendarApi
import com.fab.wab.merchant.feature.bookings.data.remote.NewBookingApi
import com.fab.wab.merchant.feature.bookings.data.repository.BookingsRepositoryImpl
import com.fab.wab.merchant.feature.bookings.data.repository.CalendarRepositoryImpl
import com.fab.wab.merchant.feature.bookings.data.repository.NewBookingRepositoryImpl
import com.fab.wab.merchant.feature.bookings.domain.repository.BookingsRepository
import com.fab.wab.merchant.feature.bookings.domain.repository.CalendarRepository
import com.fab.wab.merchant.feature.bookings.domain.repository.NewBookingRepository
import org.koin.dsl.module

val bookingsDataModule = module {
    single { BookingsApi(get()) }
    single<BookingsRepository> { BookingsRepositoryImpl(get()) }
    single { CalendarApi(get()) }
    single<CalendarRepository> { CalendarRepositoryImpl(get()) }
    single { NewBookingApi(get()) }
    single<NewBookingRepository> { NewBookingRepositoryImpl(get()) }
}
