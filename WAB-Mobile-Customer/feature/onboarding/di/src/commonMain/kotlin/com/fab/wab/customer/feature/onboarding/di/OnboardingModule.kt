package com.fab.wab.customer.feature.onboarding.di

import com.fab.wab.customer.feature.onboarding.domain.usecase.MarkOnboardingSeenUseCase
import com.fab.wab.customer.feature.onboarding.domain.usecase.ObserveOnboardingSeenUseCase
import com.fab.wab.customer.feature.onboarding.domain.usecase.SaveGuestProfileUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val onboardingModule = module {
    singleOf(::MarkOnboardingSeenUseCase)
    singleOf(::ObserveOnboardingSeenUseCase)
    singleOf(::SaveGuestProfileUseCase)
}
