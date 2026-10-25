package com.fab.wab.merchant.feature.insights.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsData
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsDataBookings
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsDataBookingsByStatus
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsDataBookingsRevenue
import com.fab.wab.merchant.core.data.contract.generated.GetStatisticsDataReviews
import com.fab.wab.merchant.core.data.mock.localizeFixture
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class StatisticsMapperTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun mockStatisticsMapEveryKpiSeriesAndRanking() {
        val fixture = localizeFixture(mockStatisticsFixture.json, "en")
        val stats = json.decodeFromString<BaseResponse<GetStatisticsData>>(fixture).data.toDomain()
        assertEquals(38, stats.bookings.total)
        assertEquals(22, stats.bookings.byStatus[BookingStatus.COMPLETED])
        assertEquals(94.7, stats.bookings.approvalRate)
        assertEquals("1240.500", stats.bookings.revenue.total)
        assertEquals(512, stats.profileViews)
        assertEquals(9, stats.newReviews)
        assertEquals(7, stats.days.size)
        assertEquals("Sara", stats.topStaff.first().firstName)
        assertEquals(14, stats.topServices.first().bookings)
        assertFalse(stats.isEmpty)
    }

    @Test
    fun nullRatesStayNullAndAnEmptyPeriodIsEmpty() {
        val zero = GetStatisticsDataBookingsByStatus(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
        val data = GetStatisticsData(
            from = "2026-10-01",
            to = "2026-10-01",
            bookings = GetStatisticsDataBookings(0.0, zero, brideBookings = 0.0, revenue = GetStatisticsDataBookingsRevenue("0", "0", "0")),
            profileViews = 0.0,
            reviews = GetStatisticsDataReviews(0.0, 0.0),
            days = emptyList(),
            topServices = emptyList(),
            topStaff = emptyList(),
        ).toDomain()
        assertNull(data.bookings.approvalRate)
        assertNull(data.bookings.averageResponseMinutes)
        assertTrue(data.isEmpty)
    }
}
