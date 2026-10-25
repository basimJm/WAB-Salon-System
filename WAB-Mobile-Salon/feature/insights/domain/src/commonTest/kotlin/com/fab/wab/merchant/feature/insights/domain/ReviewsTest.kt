package com.fab.wab.merchant.feature.insights.domain

import kotlin.test.Test
import kotlin.test.assertEquals

class ReviewsTest {

    private fun review(id: String, staff: ReviewStaff?) = Review(id, "Huda", 5.0, null, "2026-10-01T10:00:00Z", null, staff)

    @Test
    fun distributionShareIsSafeForEmptySummaries() {
        val summary = ReviewSummary(4.5, 4, mapOf(5 to 3, 4 to 1))
        assertEquals(0.75f, summary.share(5))
        assertEquals(0f, summary.share(1))
        assertEquals(0f, ReviewSummary.EMPTY.share(5))
        assertEquals(listOf(5, 4, 3, 2, 1), ReviewsDefaults.STARS)
    }

    @Test
    fun staffSelectorKeepsKnownStaffAndAddsNewOnesOnce() {
        val sara = ReviewStaff("s1", "Sara")
        val lina = ReviewStaff("s2", "Lina")
        val merged = mergeStaff(listOf(sara), listOf(review("r1", lina), review("r2", sara), review("r3", null), review("r4", lina)))
        assertEquals(listOf(sara, lina), merged)
    }
}
