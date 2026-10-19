package com.fab.wab.customer.feature.bookings.presentation.di

import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingDetailsDependencies
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingsDependencies
import com.fab.wab.customer.feature.bookings.presentation.controller.vm.BookingsViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val bookingsPresentationModule = module {
    factory { BookingsDependencies(loadBookings = get(), sessionStore = get(), realtime = get(), analytics = get()) }
    viewModel { BookingsViewModel(deps = get()) }
    factory {
        BookingDetailsDependencies(
            getBookingDetails = get(),
            cancelBooking = get(),
            salonDetails = get(),
            realtime = get(),
            external = get(),
            analytics = get(),
        )
    }
    viewModel { (bookingId: String) -> BookingDetailsViewModel(bookingId, deps = get()) }
}
