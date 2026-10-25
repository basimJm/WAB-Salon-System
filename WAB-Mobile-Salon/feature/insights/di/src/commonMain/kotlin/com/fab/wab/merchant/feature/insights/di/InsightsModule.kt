package com.fab.wab.merchant.feature.insights.di

import com.fab.wab.merchant.feature.insights.data.di.insightsDataModule
import org.koin.dsl.module

val insightsModule = module {
    includes(insightsDataModule)
}
