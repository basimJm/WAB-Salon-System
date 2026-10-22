package com.fab.wab.merchant.core.realtime

import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter

/**
 * Client-side mirror of the server's room rules (BUSINESS_DOMAIN §6–§7): a member only acts on events their
 * permissions cover, even if a stale subscription delivers more. Account and badge events always pass.
 */
fun RealtimeEvent.isVisibleTo(permissions: PermissionSet): Boolean = when (name) {
    RealtimeEvents.BOOKING_REQUESTED -> permissions.has(Permission.BOOKINGS_RESPOND)
    RealtimeEvents.BOOKING_UPDATED, RealtimeEvents.BOOKING_ASSIGNED ->
        permissions.anyOf(Permission.BOOKINGS_VIEW_ALL, Permission.BOOKINGS_VIEW_OWN)
    else -> true
}

/** The events of [this] stream the member may act on, read against the latest permissions. */
fun Flow<RealtimeEvent>.visibleTo(permissions: () -> PermissionSet): Flow<RealtimeEvent> =
    filter { it.isVisibleTo(permissions()) }
