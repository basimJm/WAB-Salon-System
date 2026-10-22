@file:Suppress("DEPRECATION") // kotlinx-datetime 0.7 deprecations on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.salon.presentation

import com.fab.wab.customer.core.domain.salon.DayOfWeek
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.feature.salon.presentation.screen.ReviewRow
import com.fab.wab.customer.feature.salon.presentation.screen.reviewRowsOf
import com.fab.wab.customer.feature.salon.presentation.screen.todayDayOfWeek
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals

class SalonUiMappersTest {

    @Test
    fun todayFollowsTheBusinessTimeZone() {
        // 2026-10-17T22:30Z is still Saturday in UTC but already Sunday 01:30 in Asia/Amman (UTC+3).
        assertEquals(DayOfWeek.SUN, todayDayOfWeek(Instant.parse("2026-10-17T22:30:00Z")))
        assertEquals(DayOfWeek.SAT, todayDayOfWeek(Instant.parse("2026-10-17T12:00:00Z")))
        assertEquals(DayOfWeek.FRI, todayDayOfWeek(Instant.parse("2026-10-16T12:00:00Z")))
    }

    @Test
    fun summaryCardIsTheFirstPagedRowOnlyWhenKnown() {
        val review = Review("r1", "Ahmad", 5f, "Great", "2026-10-01T10:00:00Z")
        val summary = RatingSummary(4.9f, 12)
        assertEquals(listOf<ReviewRow>(ReviewRow.Summary(summary), ReviewRow.Item(review)), reviewRowsOf(summary, listOf(review)))
        assertEquals(listOf<ReviewRow>(ReviewRow.Item(review)), reviewRowsOf(null, listOf(review)))
        assertEquals(listOf("summary", "r1"), reviewRowsOf(summary, listOf(review)).map { it.key })
    }
}
