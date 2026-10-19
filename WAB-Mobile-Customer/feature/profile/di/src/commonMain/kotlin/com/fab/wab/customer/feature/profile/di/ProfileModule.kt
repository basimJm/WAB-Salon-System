package com.fab.wab.customer.feature.profile.di

import com.fab.wab.customer.feature.profile.data.di.profileDataModule
import com.fab.wab.customer.feature.profile.domain.usecase.DeleteAccountUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.DeleteAvatarUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.LoadProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UpdateGuestProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UploadAvatarUseCase
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val profileModule = module {
    includes(profileDataModule)
    singleOf(::LoadProfileUseCase)
    singleOf(::UploadAvatarUseCase)
    singleOf(::DeleteAvatarUseCase)
    singleOf(::DeleteAccountUseCase)
    singleOf(::UpdateGuestProfileUseCase)
}
