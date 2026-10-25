package com.fab.wab.merchant.core.realtime

import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import com.fab.wab.merchant.core.domain.session.MemberRole
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** MER-011: events are acted on only when the member's permissions cover them (BUSINESS_DOMAIN §6–§7). */
class RealtimeEventFilterTest {
    private fun member(vararg keys: Permission) = PermissionSet(MemberRole.EMPLOYEE, keys.toSet())

    @Test
    fun requestsNeedBookingsRespond() {
        val request = RealtimeEvent(RealtimeEvents.BOOKING_REQUESTED)
        assertTrue(request.isVisibleTo(member(Permission.BOOKINGS_RESPOND)))
        assertFalse(request.isVisibleTo(member(Permission.BOOKINGS_VIEW_ALL)))
        assertTrue(request.isVisibleTo(PermissionSet(MemberRole.OWNER, emptySet())))
    }

    @Test
    fun bookingUpdatesNeedAViewPermissionAndAccountEventsAlwaysPass() {
        assertTrue(RealtimeEvent(RealtimeEvents.BOOKING_UPDATED).isVisibleTo(member(Permission.BOOKINGS_VIEW_OWN)))
        assertFalse(RealtimeEvent(RealtimeEvents.BOOKING_ASSIGNED).isVisibleTo(member(Permission.REVIEWS_VIEW)))
        assertTrue(RealtimeEvent(RealtimeEvents.ACCESS_REVOKED).isVisibleTo(PermissionSet.NONE))
        assertTrue(RealtimeEvent(RealtimeEvents.PERMISSIONS_UPDATED).isVisibleTo(PermissionSet.NONE))
    }

    @Test
    fun streamFilterReadsTheLatestPermissions() = runTest {
        val events = flowOf(RealtimeEvent(RealtimeEvents.BOOKING_REQUESTED), RealtimeEvent(RealtimeEvents.NOTIFICATIONS_UNREAD))
        assertEquals(listOf(RealtimeEvents.NOTIFICATIONS_UNREAD), events.visibleTo { PermissionSet.NONE }.toList().map { it.name })
    }
}
