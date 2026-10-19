package com.fab.wab.customer.feature.booking.domain.model

import com.fab.wab.customer.core.domain.salon.Closure
import com.fab.wab.customer.core.domain.salon.DaySchedule
import com.fab.wab.customer.core.domain.salon.DayOfWeek as SalonDay
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.plus

/** Why a day has no slots (`POST /salons/{id}/availability` `reason`). */
enum class NoSlotsReason(val code: String) {
    PAST("PAST"), TOO_FAR("TOO_FAR"), CLOSED("CLOSED"), NONE(""),
    ;

    companion object {
        fun fromCode(code: String?): NoSlotsReason = entries.firstOrNull { it != NONE && it.code.equals(code?.trim(), true) } ?: NONE
    }
}

data class AvailabilitySlot(val start: String, val end: String, val available: Boolean, val eligibleStaffIds: List<String>)

data class DayAvailability(val date: String, val reason: NoSlotsReason, val durationMinutes: Int, val slots: List<AvailabilitySlot>) {
    val hasAvailableSlot: Boolean get() = slots.any { it.available }
}

/** One calendar cell of step 2 (PRD S16): closed days (weekly day off or exceptional closure) are disabled. */
data class CalendarDay(val date: LocalDate, val enabled: Boolean)

/** today → today + [maxDaysAhead]; weekly days off and closures (ISO dates, inclusive) are disabled. */
fun calendarDaysOf(today: LocalDate, maxDaysAhead: Int, schedule: List<DaySchedule>, closures: List<Closure>): List<CalendarDay> {
    val offDays = schedule.filter { it.isOff }.mapNotNull { it.day }.toSet()
    val closedRanges = closures.mapNotNull { closure ->
        runCatching { LocalDate.parse(closure.from.take(ISO_DATE_LENGTH))..LocalDate.parse(closure.to.take(ISO_DATE_LENGTH)) }.getOrNull()
    }
    return (0..maxDaysAhead).map { offset ->
        val date = today.plus(DatePeriod(days = offset))
        val closed = date.dayOfWeek.toSalonDay() in offDays || closedRanges.any { date in it }
        CalendarDay(date, enabled = !closed)
    }
}

fun DayOfWeek.toSalonDay(): SalonDay = when (this) {
    DayOfWeek.SATURDAY -> SalonDay.SAT
    DayOfWeek.SUNDAY -> SalonDay.SUN
    DayOfWeek.MONDAY -> SalonDay.MON
    DayOfWeek.TUESDAY -> SalonDay.TUE
    DayOfWeek.WEDNESDAY -> SalonDay.WED
    DayOfWeek.THURSDAY -> SalonDay.THU
    DayOfWeek.FRIDAY -> SalonDay.FRI
    else -> SalonDay.SAT
}

private const val ISO_DATE_LENGTH = 10
