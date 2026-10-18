package com.fab.wab.customer.feature.home.presentation.di

import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeDependencies
import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val homePresentationModule = module {
    factory {
        HomeDependencies(
            loadHome = get(),
            currentLocation = get(),
            sessionStore = get(),
            permissions = get(),
            favorites = get(),
            realtime = get(),
            analytics = get(),
        )
    }
    viewModel { HomeViewModel(deps = get()) }
}
