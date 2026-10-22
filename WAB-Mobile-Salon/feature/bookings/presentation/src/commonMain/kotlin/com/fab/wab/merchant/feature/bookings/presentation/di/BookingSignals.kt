package com.fab.wab.merchant.feature.bookings.presentation.di

import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlin.time.Clock

/** Socket events after which a bookings screen reloads (BUSINESS_DOMAIN §7, permission-filtered by the rooms). */
internal val BOOKING_CHANGE_EVENTS = setOf(RealtimeEvents.BOOKING_REQUESTED, RealtimeEvents.BOOKING_UPDATED, RealtimeEvents.BOOKING_ASSIGNED)

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
