package com.fab.wab.merchant.feature.insights.data.di

import com.fab.wab.merchant.core.data.mock.MockFixture
import com.fab.wab.merchant.feature.insights.data.MOCK_REVIEWS_FIXTURE
import com.fab.wab.merchant.feature.insights.data.ReviewsApi
import com.fab.wab.merchant.feature.insights.data.ReviewsRepositoryImpl
import com.fab.wab.merchant.feature.insights.data.mockReviewsFixture
import com.fab.wab.merchant.feature.insights.domain.ReviewsRepository
import org.koin.core.qualifier.named
import org.koin.dsl.module

val insightsDataModule = module {
    single { ReviewsApi(get()) }
    single<ReviewsRepository> { ReviewsRepositoryImpl(get()) }
    single<MockFixture>(named(MOCK_REVIEWS_FIXTURE)) { mockReviewsFixture }
}
