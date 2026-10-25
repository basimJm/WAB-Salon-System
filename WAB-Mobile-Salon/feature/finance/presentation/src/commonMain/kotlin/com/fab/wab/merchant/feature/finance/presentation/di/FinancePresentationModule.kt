package com.fab.wab.merchant.feature.finance.presentation.di

import com.fab.wab.merchant.core.common.BusinessTime
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.BankDetailsDependencies
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.BankDetailsViewModel
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.FinanceDependencies
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.FinanceViewModel
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module
import kotlin.time.Clock

val financePresentationModule = module {
    viewModel {
        FinanceViewModel(
            FinanceDependencies(
                finance = get(),
                session = get<SessionStore>().state,
                analytics = get(),
                today = { Clock.System.now().toLocalDateTime(TimeZone.of(BusinessTime.ZONE_ID)).date },
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
