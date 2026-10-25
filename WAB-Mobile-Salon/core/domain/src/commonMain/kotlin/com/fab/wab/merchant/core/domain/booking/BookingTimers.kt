package com.fab.wab.merchant.core.domain.booking

import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds

/**
 * Pending-request clocks (PRD M07/M08, BUSINESS_DOMAIN §5): how long a request has waited and how long until the
 * server auto-cancels it (`respondBy` = start + `booking.autoCancelAfterStartMinutes`). Pure: callers pass the clock.
 */
object BookingTimers {
    /** Time since the request was created; never negative (device clock skew). */
    fun pendingAge(createdAtEpochMs: Long, nowEpochMs: Long): Duration =
        (nowEpochMs - createdAtEpochMs).coerceAtLeast(0L).milliseconds

    /** Time left before auto-cancel; zero once `respondBy` has passed. */
    fun autoCancelRemaining(respondByEpochMs: Long, nowEpochMs: Long): Duration =
        (respondByEpochMs - nowEpochMs).coerceAtLeast(0L).milliseconds
}
