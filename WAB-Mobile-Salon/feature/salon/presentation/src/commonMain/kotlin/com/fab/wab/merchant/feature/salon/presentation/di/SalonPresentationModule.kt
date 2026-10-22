package com.fab.wab.merchant.feature.salon.presentation.di

import com.fab.wab.merchant.core.common.BusinessTime
import com.fab.wab.merchant.core.domain.AppSettings
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.salon.presentation.controller.profile.ProfileMapController
import com.fab.wab.merchant.feature.salon.presentation.controller.profile.ProfileMapDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.CatalogPickerViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.CatalogRequestsViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.GalleryViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.ServiceEditDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.ServiceEditViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.ServicesViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.HoursDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.HoursViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.PolicyViewModel
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.schedule_change_reason
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonHubViewModel
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonProfileDependencies
import com.fab.wab.merchant.feature.salon.presentation.controller.vm.SalonProfileViewModel
import kotlinx.coroutines.flow.first
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.jetbrains.compose.resources.getString
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module
import kotlin.time.Clock

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
    viewModel { PolicyViewModel(repository = get(), analytics = get()) }
    viewModel { ServicesViewModel(repository = get(), analytics = get()) }
    viewModel { CatalogPickerViewModel(services = get(), salon = get()) }
    viewModel { CatalogRequestsViewModel(repository = get(), picker = get(), upload = get(), analytics = get()) }
    factory { ServiceEditDependencies(services = get(), salon = get(), picker = get(), upload = get(), analytics = get()) }
    viewModel { (serviceId: String?, catalogServiceId: String?) -> ServiceEditViewModel(serviceId, catalogServiceId, deps = get()) }
    viewModel { GalleryViewModel(gallery = get(), picker = get(), upload = get(), analytics = get()) }
    viewModel {
        HoursViewModel(
            HoursDependencies(
                repository = get(),
                affected = get(),
                analytics = get(),
                today = { Clock.System.now().toLocalDateTime(TimeZone.of(BusinessTime.ZONE_ID)).date },
                scheduleChangeReason = { getString(Res.string.schedule_change_reason) },
            ),
        )
    }
}
