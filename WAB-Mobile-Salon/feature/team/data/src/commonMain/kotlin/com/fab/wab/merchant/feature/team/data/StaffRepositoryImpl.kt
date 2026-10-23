package com.fab.wab.merchant.feature.team.data

import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersByIdLeavesBody
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.team.domain.Leave
import com.fab.wab.merchant.feature.team.domain.MemberLimits
import com.fab.wab.merchant.feature.team.domain.OpenHours
import com.fab.wab.merchant.feature.team.domain.ServiceOption
import com.fab.wab.merchant.feature.team.domain.StaffDraft
import com.fab.wab.merchant.feature.team.domain.StaffProfile
import com.fab.wab.merchant.feature.team.domain.StaffRepository
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate

/** Diagnostic text when a leave comes back with unreadable dates (never shown to users). */
private const val UNREADABLE_LEAVE = "leave dates not readable"
private const val FIRST_PAGE = 1

private fun Leave?.asResult(): AppResult<Leave> = this?.let {
    AppResult.Success(it)
} ?: AppResult.Error(AppError.UnknownError(UNREADABLE_LEAVE))

/** Saving a staff profile refreshes the shared salon (completeness `STAFF`). */
class StaffRepositoryImpl(private val api: StaffApi, private val salon: SalonRepository) : StaffRepository {
    override suspend fun profile(memberId: String): AppResult<StaffProfile> = safeApiCall {
        api.profile(memberId)
    }.mapSuccess { it.data.toDomain() }

    override suspend fun save(memberId: String, draft: StaffDraft): AppResult<StaffProfile> =
        safeApiCall {
            api.save(memberId, draft.toBody())
        }.mapSuccess { it.data.toDomain() }.also { if (it is AppResult.Success) salon.refresh() }

    override suspend fun leaves(memberId: String): AppResult<List<Leave>> =
        safeApiCall { api.leaves(memberId) }.mapSuccess { response ->
            response.data.mapNotNull { leave(it.id, it.from, it.to, it.note, it.editable) }.sortedBy { it.from }
        }

    override suspend fun addLeave(memberId: String, from: LocalDate, to: LocalDate, note: String): AppResult<Leave> =
        when (val result = safeApiCall {
            api.addLeave(memberId, PostTeamMembersByIdLeavesBody(from.toString(), to.toString(), note.trim().ifEmpty { null }))
        }) {
            is AppResult.Success -> result.data.data.let { leave(it.id, it.from, it.to, it.note, it.editable) }.asResult()
            is AppResult.Error -> result
            AppResult.Loading -> AppResult.Loading
        }

    override suspend fun updateLeave(memberId: String, leaveId: String, from: LocalDate, to: LocalDate, note: String): AppResult<Leave> =
        when (val result = safeApiCall { api.updateLeave(memberId, leaveId, leavePatch(from, to, note)) }) {
            is AppResult.Success -> result.data.data.let { leave(it.id, it.from, it.to, it.note, it.editable) }.asResult()
            is AppResult.Error -> result
            AppResult.Loading -> AppResult.Loading
        }

    override suspend fun deleteLeave(
        memberId: String,
        leaveId: String,
    ): AppResult<Unit> = safeApiCall { api.deleteLeave(memberId, leaveId) }.mapSuccess { }

    override suspend fun services(): AppResult<List<ServiceOption>> {
        val all = mutableListOf<ServiceOption>()
        var page = FIRST_PAGE
        while (true) {
            when (val result = safeApiCall { api.services(page, MemberLimits.PAGE_SIZE) }) {
                is AppResult.Success -> {
                    all += result.data.data.map { ServiceOption(it.id, it.name, it.active) }
                    if (result.data.data.size < MemberLimits.PAGE_SIZE) return AppResult.Success(all)
                    page += 1
                }
                is AppResult.Error -> return result
                AppResult.Loading -> return AppResult.Loading
            }
        }
    }

    override suspend fun salonDays(): AppResult<Map<DayOfWeek, OpenHours?>> =
        safeApiCall { api.hours() }.mapSuccess { response ->
            response.data.weeklySchedule.mapNotNull { day ->
                val weekday = DAY_CODES[day.day.uppercase()] ?: return@mapNotNull null
                val open = minutesOf(day.open)
                val close = minutesOf(day.close)
                weekday to if (day.isOff) null else openHoursOf(open, close)
            }.toMap()
        }
}

/** Open and close minutes of a salon day; null when either is missing or the day would be empty. */
private fun openHoursOf(open: Int?, close: Int?): OpenHours? =
    if (open != null && close != null && close > open) OpenHours(open, close) else null
