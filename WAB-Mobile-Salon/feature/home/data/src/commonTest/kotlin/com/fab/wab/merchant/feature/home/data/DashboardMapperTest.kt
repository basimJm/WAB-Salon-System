package com.fab.wab.merchant.feature.home.data

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetDashboardData
import com.fab.wab.merchant.core.data.contract.generated.GetDashboardDataSalon
import com.fab.wab.merchant.core.data.mock.localizeFixture
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.core.domain.session.SalonState
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DashboardMapperTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun mockDashboardMapsEveryBlock() {
        val response = json.decodeFromString<BaseResponse<GetDashboardData>>(localizeFixture(mockDashboardFixture.json, "en"))
        val dashboard = response.data.toDomain()
        assertEquals(SalonState.LIVE, dashboard.salon.state)
        assertNull(dashboard.salon.imageUrl)
        assertEquals(5, dashboard.subscriptionWarning?.daysRemaining)
        assertEquals(3, dashboard.unreadNotifications)
        val pending = assertNotNull(dashboard.pending)
        assertEquals(2, pending.count)
        assertTrue(pending.items.first().hasBride)
        assertEquals(3, pending.items.first().persons)
        assertEquals(BookingStatus.PENDING, pending.items.first().status)
        assertEquals("WAB-24740", dashboard.today?.next?.reference)
        assertEquals(3, dashboard.today?.timeline?.size)
        assertEquals(listOf("Sample text"), dashboard.today?.timeline?.first()?.staffNames)
        assertEquals("1240.500", dashboard.quickStats?.revenue)
    }

    @Test
    fun missingBlocksStayNullAndUnknownStateIsNull() {
        val dashboard = GetDashboardData(
            salon = GetDashboardDataSalon("s", "Bella", " ", "SOMETHING", listOf("SERVICE")),
            unreadNotifications = 0.0,
        ).toDomain()
        assertNull(dashboard.salon.state)
        assertNull(dashboard.salon.imageUrl)
        assertNull(dashboard.pending)
        assertNull(dashboard.today)
        assertNull(dashboard.quickStats)
        assertEquals(listOf("SERVICE"), dashboard.salon.missing)
    }
}
