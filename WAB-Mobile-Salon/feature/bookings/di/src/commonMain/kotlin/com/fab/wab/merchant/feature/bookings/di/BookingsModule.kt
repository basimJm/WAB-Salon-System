package com.fab.wab.merchant.feature.bookings.di

import com.fab.wab.merchant.feature.bookings.data.di.bookingsDataModule
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseBookingUseCase
import org.koin.dsl.module

val bookingsModule = module {
    includes(bookingsDataModule)
    // MER-086: Completed / No-show from a close reminder (Android receiver, iOS notification action).
    factory { CloseBookingUseCase(get()) }
}
