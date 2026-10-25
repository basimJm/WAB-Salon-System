package com.fab.wab.merchant.feature.home.presentation.screen

import com.fab.wab.merchant.core.domain.booking.BookingTimers
import com.fab.wab.merchant.feature.home.domain.DashboardBooking
import kotlin.time.Duration
import kotlin.time.Instant

/** Epoch ms of an ISO instant; null when the server sent something else. */
internal fun epochMsOf(iso: String): Long? = runCatching { Instant.parse(iso.trim()).toEpochMilliseconds() }.getOrNull()

internal fun instantOf(iso: String): Instant? = runCatching { Instant.parse(iso.trim()) }.getOrNull()

/** How long the request has waited (zero when the time is unknown). */
internal fun DashboardBooking.ageAt(nowMs: Long): Duration =
    epochMsOf(requestedAt)?.let { BookingTimers.pendingAge(it, nowMs) } ?: Duration.ZERO

/** Time left before the server auto-cancels it; null when `respondBy` is unknown. */
internal fun DashboardBooking.autoCancelAt(nowMs: Long): Duration? =
    epochMsOf(respondBy)?.let { BookingTimers.autoCancelRemaining(it, nowMs) }

/** Staff names of a row joined for one line ("Sara, Lina"). */
internal fun DashboardBooking.staffLine(separator: String): String = staffNames.filter { it.isNotBlank() }.joinToString(separator)
