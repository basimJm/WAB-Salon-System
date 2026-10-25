package com.fab.wab.merchant.feature.team.presentation

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.FieldError
import com.fab.wab.merchant.core.domain.booking.AffectedBookingsRepository
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.upload.ConfirmedUpload
import com.fab.wab.merchant.core.domain.upload.PresignedUpload
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadsRepository
import com.fab.wab.merchant.feature.team.domain.MemberDraft
import com.fab.wab.merchant.feature.team.domain.TeamMember
import com.fab.wab.merchant.feature.team.domain.TeamRepository

internal fun teamMember(id: String, role: MemberRole = MemberRole.EMPLOYEE, active: Boolean = true, provides: Boolean = true) =
    TeamMember(id, "First $id", "Last", "+962791234567", null, role, emptySet(), active, provides)

internal class FakeTeam : TeamRepository {
    var list = listOf(teamMember("owner", MemberRole.OWNER), teamMember("m1"), teamMember("m2", MemberRole.MANAGER, provides = false))
    val deactivateResults = ArrayDeque<AppResult<TeamMember>>()
    val created = mutableListOf<MemberDraft>()
    val updated = mutableListOf<Pair<String, MemberDraft>>()
    val calls = mutableListOf<String>()
    val memberQueries = mutableListOf<String?>()
    val updateResults = ArrayDeque<AppResult<TeamMember>>()
    override suspend fun members(branchId: String?): AppResult<List<TeamMember>> {
        memberQueries += branchId
        return AppResult.Success(list)
    }
    override fun cached(id: String): TeamMember? = list.firstOrNull { it.id == id }
    override suspend fun member(id: String): AppResult<TeamMember> = cached(id)?.let {
        AppResult.Success(it)
    } ?: AppResult.Error(AppError.NetworkError("x"))
    override suspend fun create(draft: MemberDraft, permissions: Set<Permission>?): AppResult<TeamMember> {
        created += draft
        return AppResult.Success(teamMember("new"))
    }
    override suspend fun update(id: String, draft: MemberDraft, permissions: Set<Permission>?): AppResult<TeamMember> {
        updated += id to draft
        return updateResults.removeFirstOrNull() ?: AppResult.Success(teamMember(id))
    }
    override suspend fun deactivate(id: String): AppResult<TeamMember> {
        calls += "deactivate:$id"
        return deactivateResults.removeFirstOrNull() ?: AppResult.Success(teamMember(id, active = false))
    }
    override suspend fun reactivate(id: String): AppResult<TeamMember> {
        calls += "reactivate:$id"
        return AppResult.Success(teamMember(id, active = true))
    }
}

internal fun scheduleConflict(vararg ids: String) =
    AppResult.Error(
        AppError.ServerError(ErrorCode.SCHEDULE_CONFLICT, HTTP_CONFLICT, null, ids.map { FieldError(it, "SCHEDULE_CONFLICT", "") }),
    )

private const val HTTP_CONFLICT = 409

internal class FakeAffected : AffectedBookingsRepository {
    val cancelled = mutableListOf<Triple<List<String>, String, String>>()
    override suspend fun cancel(bookingIds: List<String>, reasonCode: String, reasonText: String): AppResult<Boolean> {
        cancelled += Triple(bookingIds, reasonCode, reasonText)
        return AppResult.Success(true)
    }
}

internal val JORDAN = Country("JO", "الأردن", "+962", null, "^7[789]\\d{7}$")

internal class FakeLocations : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(listOf(JORDAN))
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(emptyList())
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(emptyList())
}

internal class FakeUploads : UploadsRepository {
    override suspend fun presign(purpose: UploadPurpose, contentType: String, size: Long): AppResult<PresignedUpload> =
        AppResult.Success(PresignedUpload("${purpose.name}-key", "u", "PUT", emptyMap(), size))
    override suspend fun upload(
        target: PresignedUpload,
        bytes: ByteArray,
        contentType: String,
        onProgress: (Float) -> Unit,
    ): AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun confirm(
        purpose: UploadPurpose,
        key: String,
    ): AppResult<ConfirmedUpload> = AppResult.Success(ConfirmedUpload(key, "https://cdn/$key"))
}
