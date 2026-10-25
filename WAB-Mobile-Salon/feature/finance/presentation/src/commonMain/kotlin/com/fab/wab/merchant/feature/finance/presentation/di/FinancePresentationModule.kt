package com.fab.wab.merchant.feature.finance.presentation.di

import com.fab.wab.merchant.core.common.BusinessTime
import com.fab.wab.merchant.core.domain.branch.BranchSelection
import com.fab.wab.merchant.core.domain.branch.branchScopeOf
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.BankDetailsDependencies
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.BankDetailsViewModel
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.FinanceDependencies
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.FinanceViewModel
import kotlin.time.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val financePresentationModule = module {
    viewModel {
        FinanceViewModel(
            FinanceDependencies(
                finance = get(),
                session = get<SessionStore>().state,
                analytics = get(),
                today = { Clock.System.now().toLocalDateTime(TimeZone.of(BusinessTime.ZONE_ID)).date },
                branchScope = branchScopeOf(get<SessionStore>().state, get(), get()),
                selectBranch = get<BranchSelection>()::select,
            ),
        )
    }
    viewModel {
        BankDetailsViewModel(
            BankDetailsDependencies(
                bank = get(),
                locations = get(),
                session = get<SessionStore>().state,
                pending = get(),
                analytics = get(),
            ),
        )
    }
}
