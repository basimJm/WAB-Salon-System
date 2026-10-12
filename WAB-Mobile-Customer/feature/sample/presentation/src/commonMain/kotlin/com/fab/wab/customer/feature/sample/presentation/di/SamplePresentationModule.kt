package com.fab.wab.customer.feature.sample.presentation.di

import com.fab.wab.customer.feature.sample.presentation.controller.vm.SampleViewModel
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

val samplePresentationModule = module {
    viewModelOf(::SampleViewModel)
}
