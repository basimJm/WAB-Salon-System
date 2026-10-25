package com.fab.wab.merchant.feature.insights.presentation.di

import com.fab.wab.merchant.core.domain.branch.BranchSelection
import com.fab.wab.merchant.core.domain.branch.branchScopeOf
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.insights.presentation.controller.vm.ReviewsDependencies
import com.fab.wab.merchant.feature.insights.presentation.controller.vm.ReviewsViewModel
import kotlinx.coroutines.flow.map
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val insightsPresentationModule = module {
    viewModel {
        ReviewsViewModel(
            ReviewsDependencies(
                reviews = get(),
                contact = get<AppConfigRepository>().current.map { it?.contact },
                analytics = get(),
                branchScope = branchScopeOf(get<SessionStore>().state, get(), get()),
                selectBranch = get<BranchSelection>()::select,
            ),
        )
    }
}
