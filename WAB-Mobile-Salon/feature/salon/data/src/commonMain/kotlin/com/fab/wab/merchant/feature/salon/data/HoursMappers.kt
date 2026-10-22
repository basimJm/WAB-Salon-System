package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.contract.generated.PutSalonHoursWeeklyBodyDaysItem
import com.fab.wab.merchant.core.data.contract.generated.PutSalonHoursWeeklyData
import com.fab.wab.merchant.feature.salon.domain.Closure
import com.fab.wab.merchant.feature.salon.domain.DaySchedule
import com.fab.wab.merchant.feature.salon.domain.HoursData
import com.fab.wab.merchant.feature.salon.domain.HoursLimits
import com.fab.wab.merchant.feature.salon.domain.normalizeWeek
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

/** Contract day codes (`SUN`…`SAT`). */
private val DAY_CODES: Map<String, DayOfWeek> = mapOf(
    "SUN" to DayOfWeek.SUNDAY, "MON" to DayOfWeek.MONDAY, "TUE" to DayOfWeek.TUESDAY, "WED" to DayOfWeek.WEDNESDAY,
    "THU" to DayOfWeek.THURSDAY, "FRI" to DayOfWeek.FRIDAY, "SAT" to DayOfWeek.SATURDAY,
)
private val CODE_OF: Map<DayOfWeek, String> = DAY_CODES.entries.associate { (code, day) -> day to code }

private const val MINUTES_PER_HOUR = 60
private const val TIME_SEPARATOR = ":"
private const val TIME_PAD = 2
private const val ZERO = '0'
private const val ISO_DATE_LENGTH = 10

/** `HH:mm` → minutes; `24:00` is the end of the day. */
internal fun minutesOf(hhmm: String): Int? {
    val parts = hhmm.trim().split(TIME_SEPARATOR)
    val hours = parts.getOrNull(0)?.toIntOrNull() ?: return null
    val minutes = parts.getOrNull(1)?.toIntOrNull() ?: return null
    return (hours * MINUTES_PER_HOUR + minutes).takeIf { it in 0..HoursLimits.MINUTES_PER_DAY }
}

internal fun hhmmOf(minutes: Int): String =
    (minutes / MINUTES_PER_HOUR).toString().padStart(TIME_PAD, ZERO) + TIME_SEPARATOR + (minutes % MINUTES_PER_HOUR).toString().padStart(TIME_PAD, ZERO)

internal fun dateOf(value: String): LocalDate? = runCatching { LocalDate.parse(value.trim().take(ISO_DATE_LENGTH)) }.getOrNull()

private fun day(code: String, isOff: Boolean, open: String, close: String): DaySchedule? {
    val weekday = DAY_CODES[code.uppercase()] ?: return null
    return DaySchedule(weekday, isOff, minutesOf(open) ?: HoursLimits.DEFAULT_OPEN, minutesOf(close) ?: HoursLimits.DEFAULT_CLOSE)
}

internal fun closureOf(id: String, from: String, to: String, reason: String, editable: Boolean): Closure? {
    val start = dateOf(from) ?: return null
    return Closure(id, start, dateOf(to) ?: start, reason, editable)
}

fun GetSalonHoursData.toDomain(): HoursData = HoursData(
    week = normalizeWeek(weeklySchedule.mapNotNull { day(it.day, it.isOff, it.open, it.close) }),
    closures = closures.mapNotNull { closureOf(it.id, it.from, it.to, it.reason, it.editable) }.sortedBy { it.from },
)

fun PutSalonHoursWeeklyData.toDomain(): HoursData = HoursData(
    week = normalizeWeek(weeklySchedule.mapNotNull { day(it.day, it.isOff, it.open, it.close) }),
    closures = closures.mapNotNull { closureOf(it.id, it.from, it.to, it.reason, it.editable) }.sortedBy { it.from },
)

fun DaySchedule.toBody(): PutSalonHoursWeeklyBodyDaysItem =
    PutSalonHoursWeeklyBodyDaysItem(CODE_OF.getValue(day), isOff, hhmmOf(openMinute), hhmmOf(closeMinute))
