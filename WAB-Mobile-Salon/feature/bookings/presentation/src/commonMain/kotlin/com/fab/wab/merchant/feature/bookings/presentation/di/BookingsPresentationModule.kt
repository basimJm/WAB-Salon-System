package com.fab.wab.merchant.feature.bookings.presentation.di

import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingsViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val bookingsPresentationModule = module {
    factory { BookingsDependencies(repository = get(), changes = bookingChanges(get()), clock = clockTicks(), analytics = get()) }
    viewModel { BookingsViewModel(deps = get()) }
    viewModel { (bookingId: String) ->
        BookingDetailsViewModel(
            bookingId = bookingId,
            repository = get(),
            changes = bookingChanges(get()),
            clock = clockTicks(),
            analytics = get(),
        )
    }
}
