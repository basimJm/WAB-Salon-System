package com.fab.wab.customer.feature.salons.presentation.di

import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsDependencies
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsViewModel
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllServicesEntry
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllServicesViewModel
import com.fab.wab.customer.feature.salons.presentation.controller.vm.FilterSheetDependencies
import com.fab.wab.customer.feature.salons.presentation.controller.vm.FilterSheetViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val salonsPresentationModule = module {
    factory {
        AllSalonsDependencies(
            searchSalons = get(),
            suggestions = get(),
            recentSearches = get(),
            currentLocation = get(),
            sessionStore = get(),
            permissions = get(),
            favorites = get(),
            analytics = get(),
        )
    }
    viewModel { (entry: AllSalonsEntry) -> AllSalonsViewModel(entry, deps = get()) }
    factory { FilterSheetDependencies(loadServices = get(), loadPriceBounds = get()) }
    viewModel { (initial: SalonFilters) -> FilterSheetViewModel(initial, deps = get()) }
    viewModel { (entry: AllServicesEntry) ->
        AllServicesViewModel(loadServices = get(), analytics = get(), businessType = entry.businessType)
    }
}
