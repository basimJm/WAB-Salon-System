package com.fab.wab.merchant.feature.team.data.di

import com.fab.wab.merchant.feature.team.data.StaffApi
import com.fab.wab.merchant.feature.team.data.StaffRepositoryImpl
import com.fab.wab.merchant.feature.team.data.TeamApi
import com.fab.wab.merchant.feature.team.data.TeamRepositoryImpl
import com.fab.wab.merchant.feature.team.domain.StaffRepository
import com.fab.wab.merchant.feature.team.domain.TeamRepository
import org.koin.dsl.module

val teamDataModule = module {
    single { TeamApi(get()) }
    single<TeamRepository> { TeamRepositoryImpl(get(), get()) }
    single { StaffApi(get()) }
    single<StaffRepository> { StaffRepositoryImpl(get(), get()) }
}
