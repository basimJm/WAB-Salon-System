package com.fab.wab.customer.feature.salon.presentation.di

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.feature.salon.presentation.controller.vm.SalonDetailsDependencies
import com.fab.wab.customer.feature.salon.presentation.controller.vm.SalonDetailsViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val salonPresentationModule = module {
    factory {
        SalonDetailsDependencies(
            getSalonDetails = get(),
            favorites = get(),
            sessionStore = get(),
            external = get(),
            analytics = get(),
            webBaseUrl = get<AppEnvironment>().webBaseUrl,
        )
    }
    viewModel { (salonId: String) -> SalonDetailsViewModel(salonId, deps = get()) }
}
