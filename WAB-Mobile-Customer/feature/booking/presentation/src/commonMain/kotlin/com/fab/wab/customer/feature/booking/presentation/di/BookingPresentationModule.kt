package com.fab.wab.customer.feature.booking.presentation.di

import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowDependencies
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val bookingPresentationModule = module {
    factory { BookingFlowDependencies(salonDetails = get(), sessionStore = get(), analytics = get()) }
    viewModel { (salonId: String) -> BookingFlowViewModel(salonId, deps = get()) }
}
