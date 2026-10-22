package com.fab.wab.customer.feature.booking.data.di

import com.fab.wab.customer.feature.booking.data.remote.AvailabilityApi
import com.fab.wab.customer.feature.booking.data.remote.BookingDraftApi
import com.fab.wab.customer.feature.booking.data.repository.AvailabilityRepositoryImpl
import com.fab.wab.customer.feature.booking.data.repository.BookingDraftRepositoryImpl
import com.fab.wab.customer.feature.booking.domain.repository.AvailabilityRepository
import com.fab.wab.customer.feature.booking.domain.repository.BookingDraftRepository
import org.koin.dsl.module

val bookingDataModule = module {
    single { BookingDraftApi(get()) }
    single<BookingDraftRepository> { BookingDraftRepositoryImpl(get()) }
    single { AvailabilityApi(get()) }
    single<AvailabilityRepository> { AvailabilityRepositoryImpl(get()) }
}
