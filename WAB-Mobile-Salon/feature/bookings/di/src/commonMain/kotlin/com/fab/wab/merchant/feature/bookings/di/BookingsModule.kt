package com.fab.wab.merchant.feature.bookings.di

import com.fab.wab.merchant.feature.bookings.data.di.bookingsDataModule
import org.koin.dsl.module

val bookingsModule = module {
    includes(bookingsDataModule)
}
