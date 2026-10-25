package com.fab.wab.merchant.feature.notifications.domain

import com.fab.wab.merchant.feature.notifications.domain.model.Notification
import com.fab.wab.merchant.feature.notifications.domain.model.NotificationTarget
import com.fab.wab.merchant.feature.notifications.domain.model.target
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class NotificationTargetTest {

    private fun notification(event: String, bookingId: String? = null) =
        Notification("n", "TYPE", event, "t", "b", false, "2026-10-24T10:00:00Z", bookingId, null)

    @Test
    fun eventsRouteToTheirScreens() {
        assertEquals(NotificationTarget.Booking("b1"), notification("booking.requested", "b1").target())
        assertEquals(NotificationTarget.Application, notification("application.approved").target())
        assertEquals(NotificationTarget.CatalogRequests, notification("catalog_request.decided").target())
        assertEquals(NotificationTarget.Finance, notification("payout.transferred").target())
        assertEquals(NotificationTarget.Finance, notification("refund.failed").target())
        assertEquals(NotificationTarget.Subscription, notification("subscription.expired").target())
        assertNull(notification("review.published").target())
        assertNull(notification("booking.updated").target())
    }
}
