package com.fab.wab.merchant.feature.team.di

import com.fab.wab.merchant.feature.team.data.di.teamDataModule
import org.koin.dsl.module

val teamModule = module {
    includes(teamDataModule)
}
