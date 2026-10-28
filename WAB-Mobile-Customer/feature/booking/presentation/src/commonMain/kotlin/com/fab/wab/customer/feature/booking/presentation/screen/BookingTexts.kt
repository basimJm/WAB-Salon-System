@file:Suppress("DEPRECATION") // kotlinx.datetime.Instant is a deprecated typealias on the K/N classpath until the datetime upgrade

package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.customer.core.common.BusinessTime
import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.designsystem.resources.Res as CoreRes
import com.fab.wab.customer.designsystem.resources.time_am
import com.fab.wab.customer.designsystem.resources.time_pm
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.StaffChoice
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_day_month
import com.fab.wab.customer.feature.booking.presentation.resources.booking_duration_minutes
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_1
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_10
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_11
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_12
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_2
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_3
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_4
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_5
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_6
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_7
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_8
import com.fab.wab.customer.feature.booking.presentation.resources.booking_month_9
import com.fab.wab.customer.feature.booking.presentation.resources.booking_separator
import com.fab.wab.customer.feature.booking.presentation.resources.booking_services_count
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_any
import com.fab.wab.customer.feature.booking.presentation.resources.booking_staff_not_selected
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.toLocalDateTime
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** Month names of the design (`t.months`), 1-based like `LocalDate.monthNumber`. */
private val MONTHS: List<StringResource> = listOf(
    Res.string.booking_month_1, Res.string.booking_month_2, Res.string.booking_month_3, Res.string.booking_month_4,
    Res.string.booking_month_5, Res.string.booking_month_6, Res.string.booking_month_7, Res.string.booking_month_8,
    Res.string.booking_month_9, Res.string.booking_month_10, Res.string.booking_month_11, Res.string.booking_month_12,
)

@Composable
internal fun monthName(monthNumber: Int): String = stringResource(MONTHS[monthNumber - 1])

/** Design `whenTxt` date part: "29 September". */
@Composable
internal fun dayMonthText(date: LocalDate): String =
    stringResource(Res.string.booking_day_month, date.dayOfMonth, monthName(date.monthNumber))

/** Local date of an ISO instant in the business time zone (Asia/Amman); null when unparsable. */
internal fun localDateOf(iso: String?): LocalDate? = iso
    ?.let { runCatching { Instant.parse(it.trim()) }.getOrNull() }
    ?.toLocalDateTime(BusinessTime.zone)
    ?.date

/** 12-hour time of an ISO instant ("10:00 AM"); null when unparsable. */
@Composable
internal fun slotTimeText(iso: String?): String? = iso?.let {
    TimeFormat.instantText(it, stringResource(CoreRes.string.time_am), stringResource(CoreRes.string.time_pm))?.time
}

/** Design `whenTxt`: "29 September · 10:00 AM" (date only when no time yet, empty without a date). */
@Composable
internal fun whenText(dateIso: String?, startIso: String?): String {
    val date = localDateOf(startIso) ?: dateIso?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: return ""
    val time = slotTimeText(startIso)
    return listOfNotNull(dayMonthText(date), time).joinToString(stringResource(Res.string.booking_separator))
}

@Composable
internal fun durationText(minutes: Int): String = stringResource(Res.string.booking_duration_minutes, minutes)

/** Design `staffName`: "Staff not selected" / "Any available staff" / first name. */
@Composable
internal fun staffNameText(staff: StaffChoice?): String = when (staff) {
    null -> stringResource(Res.string.booking_staff_not_selected)
    StaffChoice.Any -> stringResource(Res.string.booking_staff_any)
    is StaffChoice.Specific -> staff.firstName
}

/** Companion card subtitle: "2 services · 29 September · 10:00 AM · Omar". */
@Composable
internal fun personSubtitle(person: DraftPerson): String {
    val separator = stringResource(Res.string.booking_separator)
    val services = stringResource(Res.string.booking_services_count, person.serviceIds.size)
    return listOf(services, whenText(person.date, person.start), staffNameText(person.staff))
        .filter { it.isNotEmpty() }
        .joinToString(separator)
}

/** Joins non-empty parts with the design's " · ". */
@Composable
internal fun joinDots(vararg parts: String?): String =
    parts.filterNotNull().filter { it.isNotEmpty() }.joinToString(stringResource(Res.string.booking_separator))
