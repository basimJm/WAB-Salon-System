package com.fab.wab.customer.feature.salon.presentation.di

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.presentation.controller.contract.SalonDetailsArgs
import com.fab.wab.customer.feature.salon.presentation.controller.vm.ReviewsDependencies
import com.fab.wab.customer.feature.salon.presentation.controller.vm.ReviewsViewModel
import com.fab.wab.customer.feature.salon.presentation.controller.vm.SalonDetailsDependencies
import com.fab.wab.customer.feature.salon.presentation.controller.vm.SalonDetailsViewModel
import com.fab.wab.customer.feature.salon.presentation.controller.vm.StaffSheetViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val salonPresentationModule = module {
    factory {
        SalonDetailsDependencies(
            getSalonDetails = get(),
            favorites = get(),
            sessionStore = get(),
            external = get(),
            analytics = get(),
            webBaseUrl = get<AppEnvironment>().webBaseUrl,
        )
    }
    viewModel { (args: SalonDetailsArgs) -> SalonDetailsViewModel(args.salonId, deps = get(), initialBranchId = args.branchId) }
    factory { ReviewsDependencies(loadReviews = get(), submitReview = get(), sessionStore = get(), analytics = get()) }
    viewModel { (target: ReviewTarget, addReview: Boolean) -> ReviewsViewModel(target, addReview, deps = get()) }
    viewModel { (salonId: String, memberId: String) ->
        StaffSheetViewModel(salonId, memberId, getStaffMember = get(), sessionStore = get())
    }
}
