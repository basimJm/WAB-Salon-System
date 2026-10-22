package com.fab.wab.merchant.feature.bookings.presentation.di

import com.fab.wab.merchant.core.notification.push.PushSignals
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingDetailsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsDependencies
import com.fab.wab.merchant.feature.bookings.presentation.controller.vm.BookingRequestsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.request_another_member
import org.jetbrains.compose.resources.getString
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
    viewModel {
        BookingRequestsViewModel(
            BookingRequestsDependencies(
                repository = get(),
                requests = bookingRequests(get(), PushSignals.messages),
                updates = bookingUpdates(get()),
                clock = clockTicks(),
                alert = get(),
                analytics = get(),
                anotherMember = { getString(Res.string.request_another_member) },
            ),
        )
    }
}
