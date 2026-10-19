package com.fab.wab.customer.feature.salons.presentation.di

import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsDependencies
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsViewModel
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllServicesViewModel
import com.fab.wab.customer.feature.salons.presentation.controller.vm.FilterSheetDependencies
import com.fab.wab.customer.feature.salons.presentation.controller.vm.FilterSheetViewModel
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
    factory { FilterSheetDependencies(loadServices = get(), loadPriceBounds = get()) }
    viewModel { (initial: SalonFilters, gender: Gender) -> FilterSheetViewModel(initial, gender, deps = get()) }
    viewModel { (gender: Gender) -> AllServicesViewModel(gender, loadServices = get(), analytics = get()) }
}
