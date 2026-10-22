package com.fab.wab.merchant.feature.team.data.di

import com.fab.wab.merchant.feature.team.data.TeamApi
import com.fab.wab.merchant.feature.team.data.TeamRepositoryImpl
import com.fab.wab.merchant.feature.team.domain.TeamRepository
import org.koin.dsl.module

val teamDataModule = module {
    single { TeamApi(get()) }
    single<TeamRepository> { TeamRepositoryImpl(get(), get()) }
}
