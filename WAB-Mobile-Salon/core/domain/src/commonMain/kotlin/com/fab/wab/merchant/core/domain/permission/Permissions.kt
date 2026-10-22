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
enum class OwnerCapability { TEAM_MANAGE, PAYOUT_DETAILS_MANAGE, SALON_DELETE_REQUEST }

/**
 * What the current member may do. The owner holds every permission and every owner-only capability; managers and
 * employees hold exactly their granted keys (unknown keys from the server are ignored). A guest holds nothing.
 */
data class PermissionSet(val role: MemberRole?, val granted: Set<Permission>) {
    val isOwner: Boolean get() = role == MemberRole.OWNER

    fun has(permission: Permission): Boolean = isOwner || permission in granted

    fun anyOf(vararg permissions: Permission): Boolean = permissions.any(::has)

    fun allOf(vararg permissions: Permission): Boolean = permissions.all(::has)

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

/** PRD §6.3 suggested templates (editable by the owner): the starting grant for a new manager / employee. */
object PermissionTemplates {
    val MANAGER: Set<Permission> = Permission.entries.toSet() - setOf(Permission.FINANCE_VIEW, Permission.POLICIES_MANAGE)
    val EMPLOYEE: Set<Permission> = setOf(Permission.BOOKINGS_VIEW_OWN, Permission.REVIEWS_VIEW)

    fun forRole(role: MemberRole): Set<Permission> = when (role) {
        MemberRole.OWNER -> Permission.entries.toSet()
        MemberRole.MANAGER -> MANAGER
        MemberRole.EMPLOYEE -> EMPLOYEE
    }
}
