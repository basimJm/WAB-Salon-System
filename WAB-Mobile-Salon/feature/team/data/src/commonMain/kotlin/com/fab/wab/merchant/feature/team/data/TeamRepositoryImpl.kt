package com.fab.wab.merchant.feature.team.data

import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdData
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersDataItem
import com.fab.wab.merchant.core.data.contract.generated.PatchTeamMembersByIdData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersBody
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersBodyPhone
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersByIdDeactivateData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersByIdReactivateData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersData
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.mapSuccess
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.salon.SalonRepository
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.network.safeApiCall
import com.fab.wab.merchant.feature.team.domain.MemberDraft
import com.fab.wab.merchant.feature.team.domain.MemberLimits
import com.fab.wab.merchant.feature.team.domain.TeamMember
import com.fab.wab.merchant.feature.team.domain.TeamRepository
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** `PATCH /team/members/{id}` field names (contract). */
internal object MemberKeys {
    const val FIRST_NAME = "firstName"
    const val LAST_NAME = "lastName"
    const val PHOTO_KEY = "photoKey"
    const val ROLE = "role"
    const val PERMISSIONS = "permissions"
}

private const val FIRST_PAGE = 1

/** The fields every member DTO shares, before parsing. */
private data class RawMember(
    val id: String, val firstName: String, val lastName: String, val phone: String, val photoUrl: String?, val role: String,
    val permissions: List<String>, val active: Boolean, val providesServices: Boolean,
)

private fun RawMember.toDomain() = TeamMember(
    id = id,
    firstName = firstName,
    lastName = lastName,
    phone = phone,
    photoUrl = photoUrl?.takeIf { it.isNotBlank() },
    role = MemberRole.entries.firstOrNull { it.name == role.uppercase() } ?: MemberRole.EMPLOYEE,
    permissions = permissions.mapNotNull(Permission::fromKey).toSet(),
    active = active,
    providesServices = providesServices,
)

fun GetTeamMembersDataItem.toDomain() =
    RawMember(id, firstName, lastName, phone, photoUrl, role, permissions, active, providesServices).toDomain()
fun GetTeamMembersByIdData.toDomain() =
    RawMember(id, firstName, lastName, phone, photoUrl, role, permissions, active, providesServices).toDomain()
fun PostTeamMembersData.toDomain() =
    RawMember(id, firstName, lastName, phone, photoUrl, role, permissions, active, providesServices).toDomain()
fun PatchTeamMembersByIdData.toDomain() =
    RawMember(id, firstName, lastName, phone, photoUrl, role, permissions, active, providesServices).toDomain()
fun PostTeamMembersByIdDeactivateData.toDomain() =
    RawMember(id, firstName, lastName, phone, photoUrl, role, permissions, active, providesServices).toDomain()
fun PostTeamMembersByIdReactivateData.toDomain() =
    RawMember(id, firstName, lastName, phone, photoUrl, role, permissions, active, providesServices).toDomain()

/** Name, role and permissions always; the photo only when it changed ([photoChanged]) — null removes it. */
fun MemberDraft.toPatch(photoChanged: Boolean, permissions: Set<Permission>?): JsonObject = buildJsonObject {
    put(MemberKeys.FIRST_NAME, firstName.trim())
    put(MemberKeys.LAST_NAME, lastName.trim())
    put(MemberKeys.ROLE, role.name)
    if (photoChanged) put(MemberKeys.PHOTO_KEY, photoKey?.let(::JsonPrimitive) ?: JsonNull)
    permissions?.let { keys -> put(MemberKeys.PERMISSIONS, JsonArray(keys.map { JsonPrimitive(it.name) })) }
}

/** Member changes refresh the shared salon (completeness `STAFF`). */
class TeamRepositoryImpl(private val api: TeamApi, private val salon: SalonRepository) : TeamRepository {
    private val cache = mutableMapOf<String, TeamMember>()

    override suspend fun members(): AppResult<List<TeamMember>> {
        val all = mutableListOf<TeamMember>()
        var page = FIRST_PAGE
        while (true) {
            when (val result = safeApiCall { api.members(page, MemberLimits.PAGE_SIZE) }) {
                is AppResult.Success -> {
                    all += result.data.data.map { it.toDomain() }
                    if (result.data.data.size < MemberLimits.PAGE_SIZE) break
                    page += 1
                }
                is AppResult.Error -> return result
                AppResult.Loading -> return AppResult.Loading
            }
        }
        cache.clear()
        all.forEach { cache[it.id] = it }
        return AppResult.Success(all)
    }

    override fun cached(id: String): TeamMember? = cache[id]

    override suspend fun member(id: String): AppResult<TeamMember> =
        safeApiCall { api.member(id) }.mapSuccess { it.data.toDomain() }.also { remember(it, refreshSalon = false) }

    override suspend fun create(draft: MemberDraft, permissions: Set<Permission>?): AppResult<TeamMember> {
        val body = PostTeamMembersBody(
            firstName = draft.firstName.trim(),
            lastName = draft.lastName.trim(),
            phone = PostTeamMembersBodyPhone(draft.countryCode, draft.number),
            role = draft.role.name,
            permissions = permissions?.map { it.name },
            photoKey = draft.photoKey,
        )
        return safeApiCall { api.create(body) }.mapSuccess { it.data.toDomain() }.also { remember(it) }
    }

    override suspend fun update(id: String, draft: MemberDraft, permissions: Set<Permission>?): AppResult<TeamMember> {
        val photoChanged = draft.photoKey != null || (cache[id]?.photoUrl != null && draft.photoUrl == null)
        return safeApiCall {
            api.update(id, draft.toPatch(photoChanged, permissions))
        }.mapSuccess { it.data.toDomain() }.also { remember(it) }
    }

    override suspend fun deactivate(id: String): AppResult<TeamMember> =
        safeApiCall { api.deactivate(id) }.mapSuccess { it.data.toDomain() }.also { remember(it) }

    override suspend fun reactivate(id: String): AppResult<TeamMember> =
        safeApiCall { api.reactivate(id) }.mapSuccess { it.data.toDomain() }.also { remember(it) }

    private suspend fun remember(result: AppResult<TeamMember>, refreshSalon: Boolean = true) {
        if (result !is AppResult.Success) return
        cache[result.data.id] = result.data
        if (refreshSalon) salon.refresh()
    }
}
