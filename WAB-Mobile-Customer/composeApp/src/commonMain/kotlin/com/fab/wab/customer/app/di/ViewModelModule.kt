package com.fab.wab.customer.app.di

import com.fab.wab.customer.app.controller.vm.MainViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

/** Explicit constructor call: the error-text and test-scope seams of the view model are not Koin types. */
val viewModelModule = module {
    viewModel {
        MainViewModel(
            appSettings = get(),
            appearanceSettings = get(),
            appConfigRepository = get(),
            sessionTimeOut = get(),
            sessionStore = get(),
            environment = get(),
            sessionAnalyticsSync = get(),
        )
    }
}
