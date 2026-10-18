package com.fab.wab.customer.feature.auth.presentation.di

import com.fab.wab.customer.feature.auth.presentation.controller.vm.LoginViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val authPresentationModule = module {
    viewModel { LoginViewModel(checkPhone = get(), locations = get(), appearance = get(), analytics = get()) }
}
