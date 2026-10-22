package com.fab.wab.customer.app.di

import com.fab.wab.customer.app.controller.vm.MainViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

/** Explicit constructor call: the test-scope seam of the view model is not a Koin type. */
val viewModelModule = module {
    viewModel {
        MainViewModel(
            appSettings = get(),
            appearanceSettings = get(),
            sessionTimeOut = get(),
            environment = get(),
            sessionAnalyticsSync = get(),
        )
    }
}
