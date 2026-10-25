package com.fab.wab.merchant.feature.team.domain

import com.fab.wab.merchant.core.domain.AppResult
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

/** A staff working day; [startMinute] / [endMinute] null = the salon's hours that day. */
data class StaffDay(val day: DayOfWeek, val startMinute: Int? = null, val endMinute: Int? = null) {
    val hasCustomHours: Boolean get() = startMinute != null && endMinute != null
}

/** `GET /team/members/{id}/staff` (STAFF_MANAGE). */
data class StaffProfile(
    val memberId: String,
    val providesServices: Boolean,
    val bio: String,
    val yearsOfExperience: Int?,
    val serviceIds: Set<String>,
    val brideQualified: Boolean,
    val workingDays: List<StaffDay>,
    val ratingAverage: Double,
    val ratingCount: Int,
    val customersCount: Int,
)

data class StaffDraft(
    val providesServices: Boolean = false,
    val bio: String = "",
    val years: String = "",
    val serviceIds: Set<String> = emptySet(),
    val brideQualified: Boolean = false,
    val workingDays: List<StaffDay> = emptyList(),
)

/** A salon service the member can be skilled in. */
data class ServiceOption(val id: String, val name: String, val active: Boolean)

/** Salon opening hours of one day (minutes from local midnight). */
data class OpenHours(val openMinute: Int, val closeMinute: Int)

data class Leave(val id: String, val from: LocalDate, val to: LocalDate, val note: String?, val editable: Boolean)

enum class StaffField { BIO, YEARS, DAYS }

object StaffLimits {
    const val BIO_MAX = 1_000
    const val YEARS_MAX = 80
    const val NOTE_MAX = 300
    const val STEP_MINUTES = 15
}

fun StaffProfile.toDraft(): StaffDraft =
    StaffDraft(providesServices, bio, yearsOfExperience?.toString().orEmpty(), serviceIds, brideQualified, workingDays)

/** A custom range must sit inside the salon hours of that day, on 15-minute steps, end after start. */
fun StaffDay.isValidWithin(open: OpenHours?): Boolean {
    if (open == null) return false
    val start = startMinute ?: return endMinute == null
    val end = endMinute ?: return false
    return end > start && start >= open.openMinute && end <= open.closeMinute &&
        start % StaffLimits.STEP_MINUTES == 0 && end % StaffLimits.STEP_MINUTES == 0
}

/** PRD M17 staff rules: bio ≤ 1000, years 0..80, working days only on open salon days with valid custom hours. */
fun staffErrors(draft: StaffDraft, salonDays: Map<DayOfWeek, OpenHours?>): Set<StaffField> = buildSet {
    if (draft.bio.trim().length > StaffLimits.BIO_MAX) add(StaffField.BIO)
    val years = draft.years.trim()
    if (years.isNotEmpty() && years.toIntOrNull()?.let { it in 0..StaffLimits.YEARS_MAX } != true) add(StaffField.YEARS)
    if (draft.workingDays.any { !it.isValidWithin(salonDays[it.day]) }) add(StaffField.DAYS)
}

fun leaveValid(from: LocalDate?, to: LocalDate?, note: String, today: LocalDate): Boolean =
    from != null && to != null && from <= to && from >= today && note.trim().length <= StaffLimits.NOTE_MAX

/** `/team/members/{id}/staff`, `/leaves`, plus the salon services and hours the form chooses from. */
interface StaffRepository {
    suspend fun profile(memberId: String): AppResult<StaffProfile>

    suspend fun save(memberId: String, draft: StaffDraft): AppResult<StaffProfile>

    suspend fun leaves(memberId: String): AppResult<List<Leave>>

    suspend fun addLeave(memberId: String, from: LocalDate, to: LocalDate, note: String): AppResult<Leave>

    suspend fun updateLeave(memberId: String, leaveId: String, from: LocalDate, to: LocalDate, note: String): AppResult<Leave>

    suspend fun deleteLeave(memberId: String, leaveId: String): AppResult<Unit>

    suspend fun services(): AppResult<List<ServiceOption>>

    /** Open salon days (null = day off). */
    suspend fun salonDays(): AppResult<Map<DayOfWeek, OpenHours?>>
}
