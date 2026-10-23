package com.fab.wab.merchant.feature.bookings.presentation.di

import com.fab.wab.merchant.core.notification.push.PushKeys
import com.fab.wab.merchant.core.notification.push.PushNotification
import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeEvent
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.mapNotNull
import kotlinx.coroutines.flow.merge
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.time.Clock

/** Socket events after which a bookings screen reloads (BUSINESS_DOMAIN §7, permission-filtered by the rooms). */
internal val BOOKING_CHANGE_EVENTS = setOf(
    RealtimeEvents.BOOKING_REQUESTED,
    RealtimeEvents.BOOKING_UPDATED,
    RealtimeEvents.BOOKING_ASSIGNED,
)

/** Countdowns refresh every second. */
internal const val CLOCK_TICK_MS = 1_000L

internal fun bookingChanges(realtime: RealtimeClient): Flow<Unit> =
    realtime.events.filter { it.name in BOOKING_CHANGE_EVENTS }.map { }

internal fun clockTicks(clock: Clock = Clock.System, tickMs: Long = CLOCK_TICK_MS): Flow<Long> = flow {
    while (true) {
        emit(clock.now().toEpochMilliseconds())
        delay(tickMs)
    }
}

/** Payload keys that carry the booking id (request card / booking summary). */
private val BOOKING_ID_KEYS = listOf(PushKeys.BOOKING_ID, "id", "_id")

internal fun RealtimeEvent.bookingId(): String? {
    val payload = payload as? JsonObject ?: return null
    return BOOKING_ID_KEYS.firstNotNullOfOrNull { key -> (payload[key] as? JsonPrimitive)?.content?.takeIf { it.isNotBlank() } }
}

/** New requests from the socket (app open) and FCM data messages (foreground); de-duplicated by the host. */
internal fun bookingRequests(realtime: RealtimeClient, pushes: Flow<PushNotification>): Flow<String> = merge(
    realtime.events.filter { it.name == RealtimeEvents.BOOKING_REQUESTED }.mapNotNull { it.bookingId() },
    pushes.filter { it.data[PushKeys.EVENT] == RealtimeEvents.BOOKING_REQUESTED }.mapNotNull { push ->
        push.data[PushKeys.BOOKING_ID]?.takeIf { it.isNotBlank() }
    },
)

/** Ids of bookings whose summary changed (another member may have answered a queued request). */
internal fun bookingUpdates(realtime: RealtimeClient): Flow<String> =
    realtime.events.filter { it.name == RealtimeEvents.BOOKING_UPDATED }.mapNotNull { it.bookingId() }
