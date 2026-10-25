package com.fab.wab.merchant.feature.insights.data

import com.fab.wab.merchant.core.data.contract.generated.GetReviewsData
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the reviews / statistics mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealInsightsFixturesTest {

    @Test
    fun reviewsPageAndStatisticsMap() {
        val reviews = decodeFixture("GetReviews", serializer<GetReviewsData>())
        assertTrue(reviews.data.items.isNotEmpty())
        assertEquals(reviews.data.items.size, reviews.toPage().items.size)
        assertNotNull(decodeFixture("GetStatistics", serializer<GetStatisticsData>()).data.toDomain())
    }
}
