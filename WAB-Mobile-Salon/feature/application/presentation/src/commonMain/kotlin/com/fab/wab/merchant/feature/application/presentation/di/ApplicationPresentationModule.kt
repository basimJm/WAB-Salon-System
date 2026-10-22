package com.fab.wab.merchant.feature.application.presentation.di

import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationMode
import com.fab.wab.merchant.feature.application.presentation.controller.vm.ApplicationStatusViewModel
import com.fab.wab.merchant.feature.application.presentation.controller.vm.RegistrationDependencies
import com.fab.wab.merchant.feature.application.presentation.controller.vm.RegistrationViewModel
import com.fab.wab.merchant.feature.application.presentation.controller.vm.SetupChecklistViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val applicationPresentationModule = module {
    factory {
        RegistrationDependencies(
            submit = get(),
            resubmit = get(),
            locations = get(),
            filePicker = get(),
            uploadFile = get(),
            pending = get(),
            analytics = get(),
        )
    }
    viewModel { (mode: RegistrationMode) -> RegistrationViewModel(mode, deps = get()) }
    viewModel { ApplicationStatusViewModel(getApplication = get()) }
    viewModel { SetupChecklistViewModel(salon = get(), analytics = get()) }
}
