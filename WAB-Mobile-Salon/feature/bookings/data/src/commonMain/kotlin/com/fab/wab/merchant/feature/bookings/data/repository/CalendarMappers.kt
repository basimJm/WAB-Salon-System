package com.fab.wab.merchant.feature.bookings.data.repository

import com.fab.wab.merchant.core.data.contract.generated.GetBookingsCalendarDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.feature.bookings.domain.model.CalendarEntry
import com.fab.wab.merchant.feature.bookings.domain.model.ClosureSpan
import com.fab.wab.merchant.feature.bookings.domain.model.DayHours
import com.fab.wab.merchant.feature.bookings.domain.model.SalonHours
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

/** Contract day codes (`SUN`…`SAT`). */
private val DAY_CODES = mapOf(
    "SUN" to DayOfWeek.SUNDAY, "MON" to DayOfWeek.MONDAY, "TUE" to DayOfWeek.TUESDAY, "WED" to DayOfWeek.WEDNESDAY,
    "THU" to DayOfWeek.THURSDAY, "FRI" to DayOfWeek.FRIDAY, "SAT" to DayOfWeek.SATURDAY,
)

private const val MINUTES_PER_HOUR = 60
private const val TIME_SEPARATOR = ':'
private const val ISO_DATE_LENGTH = 10

/** Unknown statuses or unreadable times drop the row instead of drawing it wrongly. */
fun GetBookingsCalendarDataItem.toDomain(): CalendarEntry? {
    val state = BookingStatus.fromCode(status) ?: return null
    val from = instantOf(start) ?: return null
    val until = instantOf(end) ?: return null
    return CalendarEntry(bookingId, referenceNumber, state, staffId, personName, isBride, from, until)
}

fun GetSalonHoursData.toDomain(): SalonHours = SalonHours(
    weekly = weeklySchedule.mapNotNull { day ->
        val weekday = DAY_CODES[day.day.uppercase()] ?: return@mapNotNull null
        val open = minuteOf(day.open)
        val close = minuteOf(day.close)
        weekday to if (day.isOff) null else dayHoursOf(open, close)
    }.toMap(),
    closures = closures.mapNotNull { closure ->
        val from = dateOf(closure.from) ?: return@mapNotNull null
        val to = dateOf(closure.to) ?: from
        ClosureSpan(from, to, closure.reason)
    },
)

/** `HH:mm` → minutes from midnight. */
internal fun minuteOf(hhmm: String): Int? {
    val parts = hhmm.trim().split(TIME_SEPARATOR)
    val hours = parts.getOrNull(0)?.toIntOrNull() ?: return null
    val minutes = parts.getOrNull(1)?.toIntOrNull() ?: return null
    return hours * MINUTES_PER_HOUR + minutes
}

/** A civil date or the date part of an ISO instant. */
internal fun dateOf(value: String): LocalDate? = runCatching { LocalDate.parse(value.trim().take(ISO_DATE_LENGTH)) }.getOrNull()

/** Open and close minutes of a working day; null when either is missing or the day would be empty. */
private fun dayHoursOf(open: Int?, close: Int?): DayHours? =
    if (open != null && close != null && close > open) DayHours(open, close) else null
