package com.fab.wab.merchant.feature.finance.di

import com.fab.wab.merchant.feature.finance.data.di.financeDataModule
import org.koin.dsl.module

val financeModule = module {
    includes(financeDataModule)
}
