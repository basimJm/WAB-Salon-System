package com.fab.wab.merchant.feature.team.domain

import com.fab.wab.merchant.core.domain.permission.OwnerCapability
import com.fab.wab.merchant.core.domain.permission.Permission

/** PRD M18 groups (Bookings, Salon, Staff, Finance, Insights); owner-only capabilities are shown locked. */
enum class PermissionGroup(val permissions: List<Permission>, val ownerOnly: List<OwnerCapability> = emptyList()) {
    BOOKINGS(listOf(Permission.BOOKINGS_VIEW_ALL, Permission.BOOKINGS_VIEW_OWN, Permission.BOOKINGS_RESPOND, Permission.BOOKINGS_OPERATE)),
    SALON(
        listOf(
            Permission.SALON_PROFILE_MANAGE, Permission.GALLERY_MANAGE, Permission.WORKING_HOURS_MANAGE,
            Permission.SERVICES_MANAGE, Permission.POLICIES_MANAGE,
        ),
        listOf(OwnerCapability.SALON_DELETE_REQUEST),
    ),
    STAFF(listOf(Permission.STAFF_MANAGE), listOf(OwnerCapability.TEAM_MANAGE)),
    FINANCE(listOf(Permission.FINANCE_VIEW, Permission.SUBSCRIPTION_VIEW), listOf(OwnerCapability.PAYOUT_DETAILS_MANAGE)),
    INSIGHTS(listOf(Permission.DASHBOARD_VIEW, Permission.REVIEWS_VIEW, Permission.STATISTICS_VIEW)),
}

fun Set<Permission>.toggled(permission: Permission): Set<Permission> = if (permission in this) this - permission else this + permission
