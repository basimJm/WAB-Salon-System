package com.fab.wab.merchant.feature.team.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.session.MemberRole

/** A salon member (`/team/members`); [phone] is E.164. The OWNER always holds every permission. */
data class TeamMember(
    val id: String,
    val firstName: String,
    val lastName: String,
    val phone: String,
    val photoUrl: String?,
    val role: MemberRole,
    val permissions: Set<Permission>,
    val active: Boolean,
    val providesServices: Boolean,
    /** Branch of a manager / employee (BUSINESS_DOMAIN §6); null for the owner. */
    val branchId: String? = null,
) {
    val fullName: String get() = listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(NAME_SEPARATOR)
    val isOwner: Boolean get() = role == MemberRole.OWNER
}

private const val NAME_SEPARATOR = " "

/** Member form (PRD M17): phone only when adding (the contract cannot change it); roles MANAGER / EMPLOYEE. */
data class MemberDraft(
    val firstName: String = "",
    val lastName: String = "",
    val countryCode: String = "",
    val number: String = "",
    val photoKey: String? = null,
    val photoUrl: String? = null,
    val role: MemberRole = MemberRole.EMPLOYEE,
    /** Required for every new member (MER-065); changing it moves the member to another branch. */
    val branchId: String? = null,
)

enum class MemberField { FIRST_NAME, LAST_NAME, PHONE, BRANCH }

object MemberLimits {
    const val NAME_MAX = 50
    const val PAGE_SIZE = 50
}

/** Roles the owner can assign. */
val ASSIGNABLE_ROLES: List<MemberRole> = listOf(MemberRole.MANAGER, MemberRole.EMPLOYEE)

/**
 * [phoneValid] = the country regex check (done by the caller with the country list); [branchRequired] = the salon has
 * branches to choose from (every manager / employee belongs to one, `BRANCH_REQUIRED` otherwise).
 */
fun memberErrors(draft: MemberDraft, isNew: Boolean, phoneValid: Boolean, branchRequired: Boolean = false): Set<MemberField> = buildSet {
    if (draft.firstName.trim().length !in 1..MemberLimits.NAME_MAX) add(MemberField.FIRST_NAME)
    if (draft.lastName.trim().length !in 1..MemberLimits.NAME_MAX) add(MemberField.LAST_NAME)
    if (isNew && !phoneValid) add(MemberField.PHONE)
    if (branchRequired && draft.branchId == null) add(MemberField.BRANCH)
}

fun TeamMember.toDraft(): MemberDraft =
    MemberDraft(firstName = firstName, lastName = lastName, photoUrl = photoUrl, role = role, branchId = branchId)

/** Who may do what on M17 (hidden, not disabled). */
data class TeamAccess(val manageTeam: Boolean, val manageStaff: Boolean) {
    /** Owner-only: add, edit name / photo / role, (de)activate, permissions. */
    val canAdd: Boolean get() = manageTeam

    fun canEdit(member: TeamMember): Boolean = manageTeam && !member.isOwner

    fun canToggleActive(member: TeamMember): Boolean = manageTeam && !member.isOwner

    /** Staff profile: STAFF_MANAGE for service providers (the owner may open anyone's). */
    fun canEditStaff(member: TeamMember): Boolean = manageStaff && (member.providesServices || manageTeam)
}

/** `/team/members*`; loaded members are kept for the form screens. */
interface TeamRepository {
    /** [branchId] = the owner's branch choice (`?branchId=`); branch members get their branch from the server. */
    suspend fun members(branchId: String? = null): AppResult<List<TeamMember>>

    fun cached(id: String): TeamMember?

    suspend fun member(id: String): AppResult<TeamMember>

    suspend fun create(draft: MemberDraft, permissions: Set<Permission>?): AppResult<TeamMember>

    /** A changed [MemberDraft.branchId] moves the member (`409 SCHEDULE_CONFLICT` with the bookings that would break). */
    suspend fun update(id: String, draft: MemberDraft, permissions: Set<Permission>? = null): AppResult<TeamMember>

    suspend fun deactivate(id: String): AppResult<TeamMember>

    suspend fun reactivate(id: String): AppResult<TeamMember>
}
