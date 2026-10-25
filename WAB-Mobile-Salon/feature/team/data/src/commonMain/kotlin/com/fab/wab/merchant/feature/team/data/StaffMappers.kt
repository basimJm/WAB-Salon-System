package com.fab.wab.merchant.feature.team.data

import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdStaffData
import com.fab.wab.merchant.core.data.contract.generated.PutTeamMembersByIdStaffBody
import com.fab.wab.merchant.core.data.contract.generated.PutTeamMembersByIdStaffBodyWorkingDaysItem
import com.fab.wab.merchant.core.data.contract.generated.PutTeamMembersByIdStaffData
import com.fab.wab.merchant.feature.team.domain.Leave
import com.fab.wab.merchant.feature.team.domain.StaffDay
import com.fab.wab.merchant.feature.team.domain.StaffDraft
import com.fab.wab.merchant.feature.team.domain.StaffProfile
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** Contract day codes (`SUN`…`SAT`). */
internal val DAY_CODES: Map<String, DayOfWeek> = mapOf(
    "SUN" to DayOfWeek.SUNDAY, "MON" to DayOfWeek.MONDAY, "TUE" to DayOfWeek.TUESDAY, "WED" to DayOfWeek.WEDNESDAY,
    "THU" to DayOfWeek.THURSDAY, "FRI" to DayOfWeek.FRIDAY, "SAT" to DayOfWeek.SATURDAY,
)
private val CODE_OF: Map<DayOfWeek, String> = DAY_CODES.entries.associate { (code, day) -> day to code }

private const val MINUTES_PER_HOUR = 60
private const val MINUTES_PER_DAY = 1_440
private const val TIME_SEPARATOR = ":"
private const val TIME_PAD = 2
private const val ZERO = '0'
private const val ISO_DATE_LENGTH = 10

internal object LeaveKeys {
    const val FROM = "from"
    const val TO = "to"
    const val NOTE = "note"
}

internal fun minutesOf(hhmm: String?): Int? {
    val parts = hhmm?.trim()?.split(TIME_SEPARATOR) ?: return null
    val hours = parts.getOrNull(0)?.toIntOrNull() ?: return null
    val minutes = parts.getOrNull(1)?.toIntOrNull() ?: return null
    return (hours * MINUTES_PER_HOUR + minutes).takeIf { it in 0..MINUTES_PER_DAY }
}

internal fun hhmmOf(minutes: Int): String =
    (minutes / MINUTES_PER_HOUR).toString().padStart(
        TIME_PAD,
        ZERO,
    ) + TIME_SEPARATOR + (minutes % MINUTES_PER_HOUR).toString().padStart(TIME_PAD, ZERO)

internal fun dateOf(value: String): LocalDate? = runCatching { LocalDate.parse(value.trim().take(ISO_DATE_LENGTH)) }.getOrNull()

private fun day(code: String, start: String?, end: String?): StaffDay? {
    val weekday = DAY_CODES[code.uppercase()] ?: return null
    val from = minutesOf(start)
    val to = minutesOf(end)
    return if (from != null && to != null) StaffDay(weekday, from, to) else StaffDay(weekday)
}

/** The fields both staff-profile DTOs share, before parsing. */
private data class RawStaffProfile(
    val memberId: String, val provides: Boolean, val bio: String?, val years: Double?, val serviceIds: List<String>, val bride: Boolean,
    val days: List<StaffDay>, val avg: Double, val count: Double, val customers: Double,
)

private fun RawStaffProfile.toDomain() = StaffProfile(
    memberId,
    provides,
    bio.orEmpty(),
    years?.toInt(),
    serviceIds.toSet(),
    bride,
    days,
    avg,
    count.toInt(),
    customers.toInt(),
)

fun GetTeamMembersByIdStaffData.toDomain() = RawStaffProfile(
    memberId, providesServices, bio, yearsOfExperience, serviceIds, brideQualified,
    workingDays.mapNotNull { day(it.day, it.start, it.end) }, rating.avg, rating.count, customersCount,
).toDomain()

fun PutTeamMembersByIdStaffData.toDomain() = RawStaffProfile(
    memberId, providesServices, bio, yearsOfExperience, serviceIds, brideQualified,
    workingDays.mapNotNull { day(it.day, it.start, it.end) }, rating.avg, rating.count, customersCount,
).toDomain()

/** PUT replaces the profile: an empty bio clears it; days without custom hours follow the salon. */
fun StaffDraft.toBody(): PutTeamMembersByIdStaffBody = PutTeamMembersByIdStaffBody(
    providesServices = providesServices,
    bio = bio.trim(),
    yearsOfExperience = years.trim().toIntOrNull(),
    serviceIds = serviceIds.toList(),
    brideQualified = brideQualified,
    workingDays = workingDays.map { staffDay ->
        val start = staffDay.startMinute
        val end = staffDay.endMinute
        PutTeamMembersByIdStaffBodyWorkingDaysItem(
            day = CODE_OF.getValue(staffDay.day),
            start = if (start != null && end != null) hhmmOf(start) else null,
            end = if (start != null && end != null) hhmmOf(end) else null,
        )
    },
)

internal fun leave(id: String, from: String, to: String, note: String?, editable: Boolean): Leave? {
    val start = dateOf(from) ?: return null
    return Leave(id, start, dateOf(to) ?: start, note?.takeIf { it.isNotBlank() }, editable)
}

fun leavePatch(from: LocalDate, to: LocalDate, note: String): JsonObject = buildJsonObject {
    put(LeaveKeys.FROM, from.toString())
    put(LeaveKeys.TO, to.toString())
    put(LeaveKeys.NOTE, note.trim().ifEmpty { null }?.let(::JsonPrimitive) ?: JsonNull)
}
