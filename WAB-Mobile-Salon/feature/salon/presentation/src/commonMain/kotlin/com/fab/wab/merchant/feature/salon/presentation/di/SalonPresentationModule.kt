package com.fab.wab.merchant.feature.salon.presentation.di

import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonHubViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val salonPresentationModule = module {
    viewModel { SalonHubViewModel(salon = get(), session = get<SessionStore>().state, analytics = get()) }
}
