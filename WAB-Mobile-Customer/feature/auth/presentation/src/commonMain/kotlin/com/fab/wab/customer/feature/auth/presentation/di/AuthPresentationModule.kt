package com.fab.wab.customer.feature.auth.presentation.di

import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.presentation.controller.vm.LoginViewModel
import com.fab.wab.customer.feature.auth.presentation.controller.vm.OtpDependencies
import com.fab.wab.customer.feature.auth.presentation.controller.vm.OtpViewModel
import com.fab.wab.customer.feature.auth.presentation.controller.vm.RegisterDependencies
import com.fab.wab.customer.feature.auth.presentation.controller.vm.RegisterViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val authPresentationModule = module {
    viewModel { LoginViewModel(checkPhone = get(), locations = get(), appearance = get(), analytics = get()) }
    factory {
        OtpDependencies(
            requestOtp = get(),
            verifyOtp = get(),
            loginWithOtpToken = get(),
            resolveDialCode = get(),
            appConfig = get(),
            pending = get(),
            analytics = get(),
        )
    }
    viewModel { (purpose: AuthPurpose, phone: PhoneNumber) -> OtpViewModel(purpose, phone, deps = get()) }
    factory {
        RegisterDependencies(
            checkPhone = get(),
            register = get(),
            locations = get(),
            sessionStore = get(),
            appearance = get(),
            pending = get(),
            analytics = get(),
        )
    }
    viewModel { (prefill: PhoneNumber?) -> RegisterViewModel(prefill, deps = get()) }
}
