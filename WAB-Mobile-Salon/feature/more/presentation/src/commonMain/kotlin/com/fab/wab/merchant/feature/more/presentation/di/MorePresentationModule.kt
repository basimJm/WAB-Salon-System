package com.fab.wab.merchant.feature.more.presentation.di

import com.fab.wab.merchant.core.common.AppEnvironment
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MoreDependencies
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MoreViewModel
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MyAccountDependencies
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MyAccountViewModel
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
            account = get(),
        )
    }
    viewModel { MoreViewModel(deps = get()) }
    viewModel {
        MyAccountViewModel(
            MyAccountDependencies(
                account = get(),
                session = get(),
                locations = get(),
                picker = get(),
                cropper = get(),
                upload = get(),
                pending = get(),
                analytics = get(),
            ),
        )
    }
}
