package com.fab.wab.customer.feature.booking.presentation.di

import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowArgs
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowDependencies
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingFlowViewModel
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingSuccessViewModel
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingVerifyDependencies
import com.fab.wab.customer.feature.booking.presentation.controller.vm.BookingVerifyViewModel
import com.fab.wab.customer.core.domain.mapSuccess
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.profile.domain.usecase.LoadProfileUseCase
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val bookingPresentationModule = module {
    factory {
        BookingFlowDependencies(
            salonDetails = get(),
            sessionStore = get(),
            loadAvailability = get(),
            createDraft = get(),
            deleteDraft = get(),
            analytics = get(),
        )
    }
    viewModel { (args: BookingFlowArgs) -> BookingFlowViewModel(args.salonId, deps = get(), initialBranchId = args.branchId) }
    viewModel { (bookingId: String, referenceNumber: String) -> BookingSuccessViewModel(bookingId, referenceNumber, analytics = get()) }
    factory {
        val loadProfile: LoadProfileUseCase = get()
        BookingVerifyDependencies(
            getDraft = get(),
            verifyOtp = get(),
            createBooking = get(),
            customerPhone = { loadProfile().mapSuccess { PhoneNumber(it.phoneCountryCode, it.phoneNumber) } },
            pending = get(),
            analytics = get(),
        )
    }
    viewModel { (draftId: String) -> BookingVerifyViewModel(draftId, deps = get()) }
}
