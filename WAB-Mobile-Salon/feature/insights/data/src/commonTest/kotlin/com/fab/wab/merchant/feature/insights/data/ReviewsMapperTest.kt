package com.fab.wab.merchant.feature.insights.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetReviewsData
import com.fab.wab.merchant.core.data.contract.generated.GetReviewsDataSummary
import com.fab.wab.merchant.core.data.mock.localizeFixture
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ReviewsMapperTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun mockReviewsMapWithStaffBranchAndDistribution() {
        val page = json.decodeFromString<BaseResponse<GetReviewsData>>(localizeFixture(mockReviewsFixture.json, "en")).toPage()
        assertEquals(4, page.items.size)
        assertEquals("Sara", page.items.first().staff?.firstName)
        assertNull(page.items[2].staff)
        assertEquals("Sample text", page.items.first().branchName)
        assertEquals(126, page.summary.count)
        assertEquals(88, page.summary.distribution[5])
        assertFalse(page.hasMore)
    }

    @Test
    fun oddDistributionValuesCountAsZeroAndBlankCommentsAreNull() {
        val summary = GetReviewsDataSummary(4.0, 2.0, mapOf("4" to JsonPrimitive(2), "5" to JsonPrimitive("x"))).toDomain()
        assertEquals(2, summary.distribution[4])
        assertEquals(0, summary.distribution[5])
        assertEquals(0, summary.distribution[1])
        val full = BaseResponse(true, null, GetReviewsData(List(20) { item(it) }, GetReviewsDataSummary(5.0, 20.0, emptyMap()))).toPage()
        assertTrue(full.hasMore, "a full page without meta may have more")
        assertNull(full.items.first().comment)
    }

    private fun item(index: Int) = com.fab.wab.merchant.core.data.contract.generated.GetReviewsDataItemsItem(
        id = "r$index",
        customerName = "Huda",
        rating = 5.0,
        comment = " ",
        createdAt = "2026-10-01T10:00:00Z",
    )
}
