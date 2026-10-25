package com.fab.wab.merchant.core.domain.permission

import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SessionState

/** The 15 grantable keys of PRD §6.2 (`MemberProfile.permissions`). */
enum class Permission {
    DASHBOARD_VIEW,
    BOOKINGS_VIEW_ALL,
    BOOKINGS_VIEW_OWN,
    BOOKINGS_RESPOND,
    BOOKINGS_OPERATE,
    SALON_PROFILE_MANAGE,
    GALLERY_MANAGE,
    WORKING_HOURS_MANAGE,
    SERVICES_MANAGE,
    STAFF_MANAGE,
    POLICIES_MANAGE,
    REVIEWS_VIEW,
    STATISTICS_VIEW,
    FINANCE_VIEW,
    SUBSCRIPTION_VIEW,
    ;

    companion object {
        fun fromKey(key: String): Permission? = entries.firstOrNull { it.name == key }
    }
}

/** Owner-only capabilities (PRD §6.2): never stored in `permissions[]`, never grantable. */
enum class OwnerCapability { TEAM_MANAGE, PAYOUT_DETAILS_MANAGE, SALON_DELETE_REQUEST, BRANCHES_MANAGE }

/**
 * What the current member may do. The owner holds every permission and every owner-only capability; managers and
 * employees hold exactly their granted keys (unknown keys from the server are ignored). A guest holds nothing.
 */
data class PermissionSet(val role: MemberRole?, val granted: Set<Permission>) {
    val isOwner: Boolean get() = role == MemberRole.OWNER

    /** A manager / employee: every permission applies to their branch only (BUSINESS_DOMAIN §6 branch scope). */
    val isBranchMember: Boolean get() = role != null && !isOwner

    /** Salon-wide keys ([BranchPermissions.OWNER_SCOPE_ONLY]) never count for a branch member, even if sent. */
    fun has(permission: Permission): Boolean =
        isOwner || (permission in granted && !(isBranchMember && permission in BranchPermissions.OWNER_SCOPE_ONLY))

    fun anyOf(vararg permissions: Permission): Boolean = permissions.any(::has)

    fun allOf(vararg permissions: Permission): Boolean = permissions.all(::has)

    @Suppress("UnusedParameter") // every capability is owner-only today; naming it keeps call sites explicit (PRD §6.2)
    fun can(capability: OwnerCapability): Boolean = isOwner

    companion object {
        val NONE = PermissionSet(role = null, granted = emptySet())

        fun of(role: MemberRole?, keys: Set<String>): PermissionSet =
            PermissionSet(role, keys.mapNotNull(Permission::fromKey).toSet())
    }
}

/** The permission set of the signed-in member (from the cached keys), or [PermissionSet.NONE] for a guest. */
fun SessionState.permissionSet(): PermissionSet = when (this) {
    is SessionState.SignedIn -> PermissionSet.of(member.role, permissions)
    SessionState.Guest -> PermissionSet.NONE
}

/** Salon-wide permissions a branch member (manager / employee) can never hold (BUSINESS_DOMAIN §6 branch scope). */
object BranchPermissions {
    val OWNER_SCOPE_ONLY: Set<Permission> = setOf(Permission.FINANCE_VIEW, Permission.SUBSCRIPTION_VIEW, Permission.POLICIES_MANAGE)

    /** What the owner may grant to a member of one branch. */
    val GRANTABLE: Set<Permission> = Permission.entries.toSet() - OWNER_SCOPE_ONLY
}

/** PRD §6.3 / BUSINESS_DOMAIN §6 templates (editable by the owner): the starting grant for a new manager / employee. */
object PermissionTemplates {
    val MANAGER: Set<Permission> = BranchPermissions.GRANTABLE
    val EMPLOYEE: Set<Permission> = setOf(Permission.BOOKINGS_VIEW_OWN, Permission.REVIEWS_VIEW)

    fun forRole(role: MemberRole): Set<Permission> = when (role) {
        MemberRole.OWNER -> Permission.entries.toSet()
        MemberRole.MANAGER -> MANAGER
        MemberRole.EMPLOYEE -> EMPLOYEE
    }
}
