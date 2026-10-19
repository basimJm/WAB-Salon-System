@file:Suppress("DEPRECATION") // kotlinx.datetime.Instant is a deprecated typealias on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.notifications.domain.model

import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/** Design Script S19: "now", "n minutes ago", "n hours ago", "yesterday", "n days ago", then the full date. */
sealed interface RelativeTime {
    data object Now : RelativeTime
    data class Minutes(val value: Int) : RelativeTime
    data class Hours(val value: Int) : RelativeTime
    data object Yesterday : RelativeTime
    data class Days(val value: Int) : RelativeTime
    data class Date(val iso: String) : RelativeTime
}

object RelativeTimeRules {
    const val NOW_UNDER_MINUTES = 1
    const val MINUTES_PER_HOUR = 60
    const val HOURS_PER_DAY = 24
    const val YESTERDAY_DAYS = 1
    const val FULL_DATE_FROM_DAYS = 7
}

private const val MINUTES_PER_DAY = RelativeTimeRules.HOURS_PER_DAY * RelativeTimeRules.MINUTES_PER_HOUR

/** Calendar-day differences are computed in [zoneId] so "yesterday" follows the Amman day, not a 24 h window. */
fun relativeTimeOf(createdAtIso: String, now: Instant, zoneId: String): RelativeTime? {
    val created = runCatching { Instant.parse(createdAtIso) }.getOrNull() ?: return null
    val zone = TimeZone.of(zoneId)
    val elapsedMinutes = ((now - created).inWholeMinutes).coerceAtLeast(0)
    if (elapsedMinutes < RelativeTimeRules.NOW_UNDER_MINUTES) return RelativeTime.Now
    if (elapsedMinutes < RelativeTimeRules.MINUTES_PER_HOUR) return RelativeTime.Minutes(elapsedMinutes.toInt())
    val dayDiff = (now.toLocalDateTime(zone).date.toEpochDays() - created.toLocalDateTime(zone).date.toEpochDays()).toInt()
    return when {
        dayDiff <= 0 -> RelativeTime.Hours((elapsedMinutes / RelativeTimeRules.MINUTES_PER_HOUR).toInt())
        dayDiff == RelativeTimeRules.YESTERDAY_DAYS && elapsedMinutes < MINUTES_PER_DAY ->
            RelativeTime.Hours((elapsedMinutes / RelativeTimeRules.MINUTES_PER_HOUR).toInt())
        dayDiff == RelativeTimeRules.YESTERDAY_DAYS -> RelativeTime.Yesterday
        dayDiff < RelativeTimeRules.FULL_DATE_FROM_DAYS -> RelativeTime.Days(dayDiff)
        else -> RelativeTime.Date(created.toLocalDateTime(zone).date.toString())
    }
}
