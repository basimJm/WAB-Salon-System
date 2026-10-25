package com.fab.wab.merchant.feature.insights.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.daysUntil
import kotlinx.datetime.isoDayNumber
import kotlinx.datetime.minus
import kotlinx.datetime.plus

/** M21 period selector (design 07 `periods`). */
enum class StatsPeriod { TODAY, WEEK, MONTH, CUSTOM }

object StatisticsLimits {
    /** The server accepts at most 92 civil days per request (contract). */
    const val MAX_DAYS = 92
    private const val DAYS_PER_WEEK = 7

    /** Jordan's week starts on Saturday (same as the calendar). */
    val WEEK_START: DayOfWeek = DayOfWeek.SATURDAY

    internal fun daysSinceWeekStart(day: DayOfWeek): Int = (day.isoDayNumber - WEEK_START.isoDayNumber + DAYS_PER_WEEK) % DAYS_PER_WEEK
}

/** Inclusive dates of a preset relative to [today] (Asia/Amman); CUSTOM keeps the chosen dates (null). */
fun StatsPeriod.dates(today: LocalDate): Pair<LocalDate, LocalDate>? = when (this) {
    StatsPeriod.TODAY -> today to today
    StatsPeriod.WEEK -> today.minus(DatePeriod(days = StatisticsLimits.daysSinceWeekStart(today.dayOfWeek))) to today
    StatsPeriod.MONTH -> LocalDate(today.year, today.month, 1) to today
    StatsPeriod.CUSTOM -> null
}

/** A custom range the server accepts: `from` ≤ `to`, at most [StatisticsLimits.MAX_DAYS] days (the end moves to fit). */
fun clampRange(from: LocalDate, to: LocalDate): Pair<LocalDate, LocalDate> {
    val end = if (to < from) from else to
    val lastAllowed = from.plus(DatePeriod(days = StatisticsLimits.MAX_DAYS - 1))
    return from to if (from.daysUntil(end) >= StatisticsLimits.MAX_DAYS) lastAllowed else end
}

/** Revenue as the contract's JOD decimal strings: collected online + marked paid at the salon. */
data class Revenue(val online: String, val atSalon: String, val total: String)

/** Rates are percentages with one decimal; null when there is nothing to measure (shown as "—"). */
data class BookingStats(
    val total: Int,
    val byStatus: Map<BookingStatus, Int>,
    val approvalRate: Double?,
    val cancellationRate: Double?,
    val noShowRate: Double?,
    val averageResponseMinutes: Double?,
    val brideBookings: Int,
    val revenue: Revenue,
)

data class DayStat(val date: String, val bookings: Int, val revenue: String)

data class TopService(val id: String, val name: String, val bookings: Int)

data class TopStaff(val id: String, val firstName: String, val bookings: Int, val rating: Double)

data class Statistics(
    val bookings: BookingStats,
    val profileViews: Int,
    val newReviews: Int,
    val averageRating: Double,
    val days: List<DayStat>,
    val topServices: List<TopService>,
    val topStaff: List<TopStaff>,
) {
    /** "No data for this period": no bookings, views or reviews. */
    val isEmpty: Boolean get() = bookings.total == 0 && profileViews == 0 && newReviews == 0
}

/** `GET /statistics?from&to&branchId` (STATISTICS_VIEW); civil days in Asia/Amman. */
interface StatisticsRepository {
    suspend fun statistics(from: LocalDate, to: LocalDate, branchId: String?): AppResult<Statistics>
}

/** Bar heights of a chart (0f..1f of the busiest day); an all-zero series stays flat. */
fun barShares(values: List<Double>): List<Float> {
    val max = values.maxOrNull()?.takeIf { it > 0.0 } ?: return values.map { 0f }
    return values.map { (it / max).toFloat() }
}
