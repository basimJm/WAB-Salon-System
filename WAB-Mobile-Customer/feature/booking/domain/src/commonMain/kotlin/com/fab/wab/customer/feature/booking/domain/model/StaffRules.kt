@file:Suppress("DEPRECATION") // kotlinx.datetime.Instant is a deprecated typealias on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.booking.domain.model

import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.minutes

/** PRD S16 step 4: the same staff member cannot serve two persons of the draft at overlapping times. */
fun hasStaffOverlap(
    persons: List<DraftPerson>,
    currentIndex: Int,
    staffId: String,
    start: String,
    durationMinutes: Int,
    durationOf: (DraftPerson) -> Int,
): Boolean {
    val from = runCatching { Instant.parse(start) }.getOrNull() ?: return false
    val to = from + durationMinutes.minutes
    return persons.withIndex().any { (index, other) ->
        if (index == currentIndex) return@any false
        val otherStaff = (other.staff as? StaffChoice.Specific)?.staffId ?: return@any false
        val otherStart = other.start?.let { runCatching { Instant.parse(it) }.getOrNull() } ?: return@any false
        otherStaff == staffId && otherStart < to && from < otherStart + durationOf(other).minutes
    }
}
