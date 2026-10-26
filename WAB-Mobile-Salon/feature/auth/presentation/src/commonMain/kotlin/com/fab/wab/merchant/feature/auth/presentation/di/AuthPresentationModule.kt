package com.fab.wab.merchant.feature.auth.presentation.di

import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.presentation.controller.vm.LoginViewModel
import com.fab.wab.merchant.feature.auth.presentation.controller.vm.OtpDependencies
import com.fab.wab.merchant.feature.auth.presentation.controller.vm.OtpViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val authPresentationModule = module {
    viewModel { LoginViewModel(checkPhone = get(), locations = get(), appearance = get(), analytics = get()) }
    factory {
        OtpDependencies(
            requestOtp = get(),
            // Mock data source: the contract fixtures answer request + verify, so any code signs in.
            verifyOtp = get(),
            loginWithOtpToken = get(),
            resolveDialCode = get(),
            appConfig = get(),
            pending = get(),
            analytics = get(),
        )
    }
    viewModel { (purpose: AuthPurpose, phone: PhoneNumber) -> OtpViewModel(purpose, phone, deps = get()) }
}
