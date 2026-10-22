package com.fab.wab.merchant.feature.salon.presentation.di

import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.salon.presentation.controller.profile.ProfileMapController
import com.fab.wab.merchant.feature.salon.presentation.controller.profile.ProfileMapDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.GalleryViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonHubViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonProfileDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonProfileViewModel
import kotlinx.coroutines.flow.first
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val salonPresentationModule = module {
    viewModel { SalonHubViewModel(salon = get(), session = get<SessionStore>().state, analytics = get()) }
    factory {
        val settings = get<AppSettings>()
        ProfileMapController(
            ProfileMapDependencies(
                geocoder = get(),
                places = get(),
                location = get(),
                permissions = get(),
                language = { settings.language.first() },
            ),
        )
    }
    factory {
        SalonProfileDependencies(
            salon = get(),
            profiles = get(),
            locations = get(),
            filePicker = get(),
            cropper = get(),
            upload = get(),
            map = get(),
            analytics = get(),
        )
    }
    viewModel { SalonProfileViewModel(deps = get()) }
    viewModel { GalleryViewModel(gallery = get(), picker = get(), upload = get(), analytics = get()) }
}
