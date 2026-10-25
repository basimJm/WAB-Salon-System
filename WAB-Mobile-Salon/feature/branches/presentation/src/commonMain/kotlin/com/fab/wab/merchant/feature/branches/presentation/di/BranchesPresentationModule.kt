package com.fab.wab.merchant.feature.branches.presentation.di

import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.designsystem.components.map.MapPickerController
import com.fab.wab.merchant.designsystem.components.map.MapPickerDependencies
import com.fab.wab.merchant.feature.branches.presentation.controller.vm.BranchEditDependencies
import com.fab.wab.merchant.feature.branches.presentation.controller.vm.BranchEditViewModel
import com.fab.wab.merchant.feature.branches.presentation.controller.vm.BranchesViewModel
import kotlinx.coroutines.flow.first
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

/** Branch list + form; the repository and the switcher selection are core singletons (`dataModule`). */
val branchesPresentationModule = module {
    viewModel { BranchesViewModel(repository = get(), analytics = get()) }
    factory {
        val settings = get<AppSettings>()
        val map = MapPickerController(
            MapPickerDependencies(
                geocoder = get(),
                places = get(),
                location = get(),
                permissions = get(),
                language = { settings.language.first() },
            ),
        )
        BranchEditDependencies(branches = get(), locations = get(), map = map, analytics = get())
    }
    viewModel { (branchId: String?) -> BranchEditViewModel(branchId, deps = get()) }
}
