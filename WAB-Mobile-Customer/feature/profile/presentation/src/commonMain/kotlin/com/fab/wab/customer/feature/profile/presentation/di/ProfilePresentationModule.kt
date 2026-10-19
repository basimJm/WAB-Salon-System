package com.fab.wab.customer.feature.profile.presentation.di

import com.fab.wab.customer.feature.profile.presentation.controller.vm.EditProfileDependencies
import com.fab.wab.customer.feature.profile.presentation.controller.vm.EditProfileViewModel
import com.fab.wab.customer.feature.profile.presentation.controller.vm.ProfileDependencies
import com.fab.wab.customer.feature.profile.presentation.controller.vm.ProfileViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val profilePresentationModule = module {
    factory {
        ProfileDependencies(
            sessionStore = get(), appearance = get(), config = get(), environment = get(),
            loadProfile = get(), uploadAvatar = get(), deleteAvatar = get(), deleteAccount = get(), updateGuest = get(),
            logout = get(), setPushEnabled = get(), imagePicker = get(), permissions = get(), external = get(), analytics = get(),
        )
    }
    viewModel { ProfileViewModel(deps = get()) }
    factory { EditProfileDependencies(loadProfile = get(), updateProfile = get(), changePhone = get(), locations = get(), pending = get(), analytics = get()) }
    viewModel { EditProfileViewModel(deps = get()) }
}
