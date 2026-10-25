package com.fab.wab.merchant.feature.home.di

import com.fab.wab.merchant.feature.home.data.di.homeDataModule
import org.koin.dsl.module

val homeModule = module {
    includes(homeDataModule)
}
