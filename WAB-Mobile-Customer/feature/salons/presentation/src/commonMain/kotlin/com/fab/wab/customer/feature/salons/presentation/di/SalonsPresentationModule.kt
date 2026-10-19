package com.fab.wab.customer.feature.salons.presentation.di

import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsDependencies
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val salonsPresentationModule = module {
    factory {
        AllSalonsDependencies(
            searchSalons = get(),
            currentLocation = get(),
            sessionStore = get(),
            permissions = get(),
            favorites = get(),
            analytics = get(),
        )
    }
    viewModel { (entry: AllSalonsEntry) -> AllSalonsViewModel(entry, deps = get()) }
}
