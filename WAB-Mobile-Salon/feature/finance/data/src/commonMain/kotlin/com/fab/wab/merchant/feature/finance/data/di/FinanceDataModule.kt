package com.fab.wab.merchant.feature.finance.data.di

import com.fab.wab.merchant.feature.finance.data.FinanceApi
import com.fab.wab.merchant.feature.finance.data.FinanceRepositoryImpl
import com.fab.wab.merchant.feature.finance.domain.FinanceRepository
import org.koin.dsl.module

val financeDataModule = module {
    single { FinanceApi(get()) }
    single<FinanceRepository> { FinanceRepositoryImpl(get()) }
}
