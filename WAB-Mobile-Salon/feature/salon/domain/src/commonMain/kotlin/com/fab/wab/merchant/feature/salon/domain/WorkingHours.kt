package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.AppResult
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

/** Salon week order (Saturday → Friday, PRD M15). */
val SALON_WEEK: List<DayOfWeek> = listOf(
    DayOfWeek.SATURDAY, DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY,
)

/** One weekday; minutes from local midnight (Asia/Amman). */
data class DaySchedule(val day: DayOfWeek, val isOff: Boolean, val openMinute: Int, val closeMinute: Int) {
    val isValid: Boolean
        get() = isOff || (closeMinute > openMinute && openMinute % HoursLimits.STEP_MINUTES == 0 && closeMinute % HoursLimits.STEP_MINUTES == 0)
}

data class Closure(val id: String, val from: LocalDate, val to: LocalDate, val reason: String, val editable: Boolean)

data class HoursData(val week: List<DaySchedule>, val closures: List<Closure>)

object HoursLimits {
    const val STEP_MINUTES = 15
    const val MINUTES_PER_DAY = 1_440
    const val REASON_MAX = 300
    const val DEFAULT_OPEN = 540
    const val DEFAULT_CLOSE = 1_260
}

/** Every 15-minute slot of a day (00:00 … 23:45) for the time pickers; closing may also be 24:00 (end of day). */
val TIME_STEPS: List<Int> = (0 until HoursLimits.MINUTES_PER_DAY step HoursLimits.STEP_MINUTES).toList()
val CLOSE_STEPS: List<Int> = TIME_STEPS.drop(1) + HoursLimits.MINUTES_PER_DAY

/** The week in salon order, every day present (missing days are off with default hours). */
fun normalizeWeek(days: List<DaySchedule>): List<DaySchedule> = SALON_WEEK.map { day ->
    days.firstOrNull { it.day == day } ?: DaySchedule(day, isOff = true, openMinute = HoursLimits.DEFAULT_OPEN, closeMinute = HoursLimits.DEFAULT_CLOSE)
}

/** "Copy to all days": every working day takes [source]'s hours; days off stay off. */
fun List<DaySchedule>.copyHoursFrom(source: DaySchedule): List<DaySchedule> =
    map { if (it.isOff) it else it.copy(openMinute = source.openMinute, closeMinute = source.closeMinute) }

/** Closure form rules: from ≤ to, not in the past, reason 1..300. */
fun closureValid(from: LocalDate?, to: LocalDate?, reason: String, today: LocalDate): Boolean =
    from != null && to != null && from <= to && from >= today && reason.trim().length in 1..HoursLimits.REASON_MAX

/** `/salon/hours*` (WORKING_HOURS_MANAGE). */
interface HoursRepository {
    suspend fun load(): AppResult<HoursData>

    suspend fun saveWeek(days: List<DaySchedule>): AppResult<HoursData>

    suspend fun addClosure(from: LocalDate, to: LocalDate, reason: String): AppResult<Closure>

    suspend fun updateClosure(id: String, from: LocalDate, to: LocalDate, reason: String): AppResult<Closure>

    suspend fun deleteClosure(id: String): AppResult<Unit>
}
