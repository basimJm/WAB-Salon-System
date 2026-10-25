package com.fab.wab.customer.feature.notifications.data

import com.fab.wab.customer.core.data.contract.generated.GetNotificationsDataItem
import com.fab.wab.customer.core.data.contract.generated.GetNotificationsUnreadCountData
import com.fab.wab.customer.core.data.contract.generated.PostNotificationsReadData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.feature.notifications.data.repository.toDomain
import kotlinx.serialization.builtins.ListSerializer
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** CUS-060: notifications captured from the local real stack: booking rows carry the booking to open (S19 → S15). */
class RealNotificationsFixtureTest {

    @Test
    fun realBookingNotificationsCarryTheBookingAndSalon() {
        val response = decodeFixture("GetNotifications", ListSerializer(GetNotificationsDataItem.serializer()))
        assertNotNull(response.meta)
        val rows = response.data.map { it.toDomain() }
        assertTrue(rows.isNotEmpty())
        rows.filter { it.type == BOOKING_TYPE }.forEach { row ->
            assertNotNull(row.bookingId, row.event)
            assertNotNull(row.salonId, row.event)
            assertTrue(row.title.isNotBlank() && row.body.isNotBlank())
        }
    }

    @Test
    fun realUnreadCountersDecode() {
        assertTrue(decodeFixture("GetNotificationsUnreadCount", GetNotificationsUnreadCountData.serializer()).data.unread >= 0)
        assertTrue(decodeFixture("PostNotificationsRead", PostNotificationsReadData.serializer()).data.marked >= 1)
    }

    private companion object {
        const val BOOKING_TYPE = "BOOKING"
    }
}
