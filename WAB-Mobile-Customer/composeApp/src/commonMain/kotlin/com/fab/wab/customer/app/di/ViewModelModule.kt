package com.fab.wab.customer.app.di

import com.fab.wab.customer.app.controller.vm.MainViewModel
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

val viewModelModule = module {
    viewModelOf(::MainViewModel)
}
