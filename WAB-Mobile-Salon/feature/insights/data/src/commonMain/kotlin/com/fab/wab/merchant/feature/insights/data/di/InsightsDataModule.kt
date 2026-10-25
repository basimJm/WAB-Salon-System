package com.fab.wab.merchant.feature.insights.data.di

import com.fab.wab.merchant.core.data.mock.MockFixture
import com.fab.wab.merchant.feature.insights.data.MOCK_REVIEWS_FIXTURE
import com.fab.wab.merchant.feature.insights.data.MOCK_STATISTICS_FIXTURE
import com.fab.wab.merchant.feature.insights.data.ReviewsApi
import com.fab.wab.merchant.feature.insights.data.ReviewsRepositoryImpl
import com.fab.wab.merchant.feature.insights.data.StatisticsApi
import com.fab.wab.merchant.feature.insights.data.StatisticsRepositoryImpl
import com.fab.wab.merchant.feature.insights.data.mockReviewsFixture
import com.fab.wab.merchant.feature.insights.data.mockStatisticsFixture
import com.fab.wab.merchant.feature.insights.domain.ReviewsRepository
import com.fab.wab.merchant.feature.insights.domain.StatisticsRepository
import org.koin.core.qualifier.named
import org.koin.dsl.module

val insightsDataModule = module {
    single { ReviewsApi(get()) }
    single<ReviewsRepository> { ReviewsRepositoryImpl(get()) }
    single<MockFixture>(named(MOCK_REVIEWS_FIXTURE)) { mockReviewsFixture }
    single { StatisticsApi(get()) }
    single<StatisticsRepository> { StatisticsRepositoryImpl(get()) }
    single<MockFixture>(named(MOCK_STATISTICS_FIXTURE)) { mockStatisticsFixture }
}
