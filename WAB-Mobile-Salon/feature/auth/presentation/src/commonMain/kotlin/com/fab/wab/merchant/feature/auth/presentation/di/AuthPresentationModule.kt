package com.fab.wab.merchant.feature.auth.presentation.di

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.core.firebase.FakePhoneAuthGateway
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
            reportWrongAttempt = get(),
            loginWithIdToken = get(),
            resolveDialCode = get(),
            // No SMS can be sent against fixtures: the mock data source verifies any code (unit-test fake).
            phoneAuth = if (get<AppEnvironment>().usesMock) FakePhoneAuthGateway() else get(),
            appConfig = get(),
            pending = get(),
            analytics = get(),
        )
    }
    viewModel { (purpose: AuthPurpose, phone: PhoneNumber) -> OtpViewModel(purpose, phone, deps = get()) }
}
