package com.fab.wab.customer.feature.bookings.di

import com.fab.wab.customer.feature.bookings.data.di.bookingsDataModule
import com.fab.wab.customer.feature.bookings.domain.usecase.CancelBookingUseCase
import com.fab.wab.customer.feature.bookings.domain.usecase.GetBookingDetailsUseCase
import com.fab.wab.customer.feature.bookings.domain.usecase.LoadBookingsUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val bookingsModule = module {
    includes(bookingsDataModule)
    singleOf(::LoadBookingsUseCase)
    singleOf(::GetBookingDetailsUseCase)
    singleOf(::CancelBookingUseCase)
}
