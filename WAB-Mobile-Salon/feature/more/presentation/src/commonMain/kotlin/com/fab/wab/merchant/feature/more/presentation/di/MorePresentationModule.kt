package com.fab.wab.merchant.feature.more.presentation.di

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MoreDependencies
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MoreViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val morePresentationModule = module {
    factory {
        val environment = get<AppEnvironment>()
        MoreDependencies(
            session = get(),
            appearance = get(),
            config = get(),
            overlay = get(),
            alert = get(),
            logout = get(),
            analytics = get(),
            version = environment.appVersion,
            versionCode = environment.appVersionCode,
        )
    }
    viewModel { MoreViewModel(deps = get()) }
}
