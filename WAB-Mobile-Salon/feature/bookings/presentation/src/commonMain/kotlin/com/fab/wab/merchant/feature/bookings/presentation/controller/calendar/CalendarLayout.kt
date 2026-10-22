package com.fab.wab.merchant.feature.bookings.presentation.controller.calendar

import com.fab.wab.merchant.core.common.BusinessTime
import com.fab.wab.merchant.designsystem.components.calendar.CalendarBlockUi
import com.fab.wab.merchant.designsystem.components.calendar.CalendarColumnUi
import com.fab.wab.merchant.designsystem.components.calendar.CalendarShadeUi
import com.fab.wab.merchant.designsystem.components.calendar.MINUTES_PER_HOUR
import com.fab.wab.merchant.designsystem.components.calendar.ShadeKind
import com.fab.wab.merchant.designsystem.components.calendar.TimeWindow
import com.fab.wab.merchant.feature.bookings.domain.model.CalendarDefaults
import com.fab.wab.merchant.feature.bookings.domain.model.CalendarEntry
import com.fab.wab.merchant.feature.bookings.domain.model.DayHours
import com.fab.wab.merchant.feature.bookings.domain.model.SalonHours
import com.fab.wab.merchant.feature.bookings.domain.model.StaffRef
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlin.time.Instant

private val ZONE: TimeZone by lazy { TimeZone.of(BusinessTime.ZONE_ID) }
private const val MINUTES_PER_DAY = 1_440

/** A booked staff member missing from the team list (no TEAM read access): the column has no name rather than an id. */
private const val UNKNOWN_STAFF_TITLE = ""

/** Texts the layout needs from the screen (localized there). */
class CalendarTexts(
    val timeRange: (Instant, Instant) -> String,
    val closed: String,
)

fun Instant.localDate(): LocalDate = toLocalDateTime(ZONE).date

/** Minutes from local midnight of [day] (Asia/Amman); instants on other days clamp to the day's edges. */
fun Instant.minuteOn(day: LocalDate): Int {
    val local = toLocalDateTime(ZONE)
    return when {
        local.date < day -> 0
        local.date > day -> MINUTES_PER_DAY
        else -> local.hour * MINUTES_PER_HOUR + local.minute
    }
}

private fun CalendarEntry.overlaps(day: LocalDate): Boolean = start.localDate() <= day && end.localDate() >= day

private fun CalendarEntry.block(day: LocalDate, texts: CalendarTexts) = CalendarBlockUi(
    id = bookingId,
    startMinute = start.minuteOn(day),
    endMinute = end.minuteOn(day),
    customerName = personName,
    servicesText = reference,
    timeText = texts.timeRange(start, end),
    status = status,
    isBride = isBride,
)

/** Closed spans of a day: before opening and after closing, or the whole day when off / closed ([label]). */
fun closedShades(hours: DayHours?, label: String?): List<CalendarShadeUi> =
    if (hours == null) {
        listOf(CalendarShadeUi(0, MINUTES_PER_DAY, ShadeKind.CLOSED, label))
    } else {
        listOfNotNull(
            CalendarShadeUi(0, hours.openMinute, ShadeKind.CLOSED).takeIf { hours.openMinute > 0 },
            CalendarShadeUi(hours.closeMinute, MINUTES_PER_DAY, ShadeKind.CLOSED).takeIf { hours.closeMinute < MINUTES_PER_DAY },
        )
    }

private fun dayShades(day: LocalDate, hours: SalonHours?, texts: CalendarTexts): List<CalendarShadeUi> {
    if (hours == null) return emptyList()
    val open = hours.hoursOn(day)
    return closedShades(open, hours.closureOn(day)?.reason ?: texts.closed.takeIf { open == null })
}

/**
 * Day view columns (PRD M11): one per staff member — the filtered staff, else every provider plus anyone with a
 * booking that day; [own] (`BOOKINGS_VIEW_OWN`) shows only the member's own column.
 */
fun dayColumns(
    day: LocalDate,
    entries: List<CalendarEntry>,
    staff: List<StaffRef>,
    filter: Set<String>,
    own: StaffRef?,
    hours: SalonHours?,
    texts: CalendarTexts,
): List<CalendarColumnUi> {
    val ofDay = entries.filter { it.overlaps(day) }
    val people = when {
        own != null -> listOf(own)
        filter.isNotEmpty() -> staff.filter { it.id in filter }
        else -> staff + ofDay.map { it.staffId }.distinct().filter { id -> staff.none { it.id == id } }.map { StaffRef(it, UNKNOWN_STAFF_TITLE) }
    }
    val shades = dayShades(day, hours, texts)
    return people.map { person ->
        CalendarColumnUi(
            id = person.id,
            title = person.name,
            blocks = ofDay.filter { own != null || it.staffId == person.id }.map { it.block(day, texts) },
            shades = shades,
        )
    }
}

/** Week view columns: one compact column per day (id = ISO date), filtered by staff. */
fun weekColumns(
    days: List<LocalDate>,
    titles: List<String>,
    entries: List<CalendarEntry>,
    filter: Set<String>,
    hours: SalonHours?,
    texts: CalendarTexts,
): List<CalendarColumnUi> = days.mapIndexed { index, day ->
    CalendarColumnUi(
        id = day.toString(),
        title = titles.getOrElse(index) { day.toString() },
        blocks = entries.filter { it.overlaps(day) && (filter.isEmpty() || it.staffId in filter) }.map { it.block(day, texts) },
        shades = dayShades(day, hours, texts).map { it.copy(label = null) },
    )
}

/** Grid window: the widest opening of the shown days, widened to every block and snapped to whole hours. */
fun windowFor(days: List<LocalDate>, hours: SalonHours?, columns: List<CalendarColumnUi>): TimeWindow {
    val open = days.mapNotNull { hours?.hoursOn(it) }
    val start = open.minOfOrNull { it.openMinute } ?: CalendarDefaults.FALLBACK_OPEN_MINUTE
    val end = open.maxOfOrNull { it.closeMinute } ?: CalendarDefaults.FALLBACK_CLOSE_MINUTE
    return TimeWindow.covering(start, end, columns)
}
