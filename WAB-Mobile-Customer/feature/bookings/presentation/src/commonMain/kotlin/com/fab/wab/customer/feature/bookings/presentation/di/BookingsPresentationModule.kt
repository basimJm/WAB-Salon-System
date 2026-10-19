package com.fab.wab.customer.feature.bookings.presentation.di

import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingsDependencies
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingsViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val bookingsPresentationModule = module {
    factory { BookingsDependencies(loadBookings = get(), sessionStore = get(), realtime = get(), analytics = get()) }
    viewModel { BookingsViewModel(deps = get()) }
}
