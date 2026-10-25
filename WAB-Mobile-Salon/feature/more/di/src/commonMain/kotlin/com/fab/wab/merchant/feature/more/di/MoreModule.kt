package com.fab.wab.merchant.feature.more.di

import com.fab.wab.merchant.feature.more.data.di.moreDataModule
import org.koin.dsl.module

val moreModule = module {
    includes(moreDataModule)
}
