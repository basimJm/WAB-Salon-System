package com.fab.wab.merchant.feature.salon.di

import com.fab.wab.merchant.feature.salon.data.salonDataModule
import org.koin.dsl.module

val salonModule = module {
    includes(salonDataModule)
}
