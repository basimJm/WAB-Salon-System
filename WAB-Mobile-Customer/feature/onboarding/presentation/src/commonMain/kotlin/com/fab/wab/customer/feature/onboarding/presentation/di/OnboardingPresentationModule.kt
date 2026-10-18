package com.fab.wab.customer.feature.onboarding.presentation.di

import com.fab.wab.customer.feature.onboarding.presentation.controller.vm.OnboardingViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val onboardingPresentationModule = module {
    viewModel { OnboardingViewModel(markOnboardingSeen = get(), analytics = get()) }
}
