package com.fab.wab.merchant.feature.bookings.domain.model

import com.fab.wab.merchant.core.domain.booking.BookingStatus
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlin.time.Instant

/** One person's block on the calendar (`GET /bookings/calendar`, one row per person and staff). */
data class CalendarEntry(
    val bookingId: String,
    val reference: String,
    val status: BookingStatus,
    val staffId: String,
    val personName: String,
    val isBride: Boolean,
    val start: Instant,
    val end: Instant,
)

/** Opening hours of one weekday in minutes from local midnight (Asia/Amman). */
data class DayHours(val openMinute: Int, val closeMinute: Int)

/** A salon closure covering whole local days [from]..[to]. */
data class ClosureSpan(val from: LocalDate, val to: LocalDate, val reason: String)

/** `GET /salon/hours`: weekly schedule (null = day off) and the closures that have not ended. */
data class SalonHours(val weekly: Map<DayOfWeek, DayHours?>, val closures: List<ClosureSpan>) {
    fun hoursOn(date: LocalDate): DayHours? = if (closures.any { date in it.from..it.to }) null else weekly[date.dayOfWeek]

    fun closureOn(date: LocalDate): ClosureSpan? = closures.firstOrNull { date in it.from..it.to }
}

object CalendarDefaults {
    /** The server serves at most 7 days per calendar request (`CALENDAR_MAX_DAYS`). */
    const val MAX_DAYS = 7

    /** Grid window when the salon hours are unknown (09:00–21:00). */
    const val FALLBACK_OPEN_MINUTE = 540
    const val FALLBACK_CLOSE_MINUTE = 1_260
}
