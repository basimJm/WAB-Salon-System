package com.fab.wab.merchant.feature.home.data.di

import com.fab.wab.merchant.core.data.mock.MockFixture
import com.fab.wab.merchant.feature.home.data.DashboardApi
import com.fab.wab.merchant.feature.home.data.DashboardRepositoryImpl
import com.fab.wab.merchant.feature.home.data.MOCK_DASHBOARD_FIXTURE
import com.fab.wab.merchant.feature.home.data.mockDashboardFixture
import com.fab.wab.merchant.feature.home.domain.DashboardRepository
import org.koin.core.qualifier.named
import org.koin.dsl.module

val homeDataModule = module {
    single { DashboardApi(get()) }
    single<DashboardRepository> { DashboardRepositoryImpl(get()) }
    single<MockFixture>(named(MOCK_DASHBOARD_FIXTURE)) { mockDashboardFixture }
}
