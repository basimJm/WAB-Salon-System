package com.fab.wab.merchant.feature.team.presentation.screen

import com.fab.wab.merchant.core.domain.permission.OwnerCapability
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.feature.team.domain.PermissionGroup
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.cap_branches_manage
import com.fab.wab.merchant.feature.team.presentation.resources.cap_payout_details_manage
import com.fab.wab.merchant.feature.team.presentation.resources.cap_salon_delete_request
import com.fab.wab.merchant.feature.team.presentation.resources.cap_team_manage
import com.fab.wab.merchant.feature.team.presentation.resources.group_bookings
import com.fab.wab.merchant.feature.team.presentation.resources.group_finance
import com.fab.wab.merchant.feature.team.presentation.resources.group_insights
import com.fab.wab.merchant.feature.team.presentation.resources.group_salon
import com.fab.wab.merchant.feature.team.presentation.resources.group_staff
import com.fab.wab.merchant.feature.team.presentation.resources.perm_bookings_operate
import com.fab.wab.merchant.feature.team.presentation.resources.perm_bookings_operate_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_bookings_respond
import com.fab.wab.merchant.feature.team.presentation.resources.perm_bookings_respond_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_bookings_view_all
import com.fab.wab.merchant.feature.team.presentation.resources.perm_bookings_view_all_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_bookings_view_own
import com.fab.wab.merchant.feature.team.presentation.resources.perm_bookings_view_own_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_dashboard_view
import com.fab.wab.merchant.feature.team.presentation.resources.perm_dashboard_view_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_finance_view
import com.fab.wab.merchant.feature.team.presentation.resources.perm_finance_view_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_gallery_manage
import com.fab.wab.merchant.feature.team.presentation.resources.perm_gallery_manage_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_policies_manage
import com.fab.wab.merchant.feature.team.presentation.resources.perm_policies_manage_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_reviews_view
import com.fab.wab.merchant.feature.team.presentation.resources.perm_reviews_view_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_salon_profile_manage
import com.fab.wab.merchant.feature.team.presentation.resources.perm_salon_profile_manage_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_services_manage
import com.fab.wab.merchant.feature.team.presentation.resources.perm_services_manage_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_staff_manage
import com.fab.wab.merchant.feature.team.presentation.resources.perm_staff_manage_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_statistics_view
import com.fab.wab.merchant.feature.team.presentation.resources.perm_statistics_view_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_subscription_view
import com.fab.wab.merchant.feature.team.presentation.resources.perm_subscription_view_sub
import com.fab.wab.merchant.feature.team.presentation.resources.perm_working_hours_manage
import com.fab.wab.merchant.feature.team.presentation.resources.perm_working_hours_manage_sub
import org.jetbrains.compose.resources.StringResource

/** Titles and descriptions of PRD §6.2 (every key has one: `PermissionCopyTest`). */
internal val PERMISSION_COPY: Map<Permission, Pair<StringResource, StringResource>> = mapOf(
    Permission.DASHBOARD_VIEW to (Res.string.perm_dashboard_view to Res.string.perm_dashboard_view_sub),
    Permission.BOOKINGS_VIEW_ALL to (Res.string.perm_bookings_view_all to Res.string.perm_bookings_view_all_sub),
    Permission.BOOKINGS_VIEW_OWN to (Res.string.perm_bookings_view_own to Res.string.perm_bookings_view_own_sub),
    Permission.BOOKINGS_RESPOND to (Res.string.perm_bookings_respond to Res.string.perm_bookings_respond_sub),
    Permission.BOOKINGS_OPERATE to (Res.string.perm_bookings_operate to Res.string.perm_bookings_operate_sub),
    Permission.SALON_PROFILE_MANAGE to (Res.string.perm_salon_profile_manage to Res.string.perm_salon_profile_manage_sub),
    Permission.GALLERY_MANAGE to (Res.string.perm_gallery_manage to Res.string.perm_gallery_manage_sub),
    Permission.WORKING_HOURS_MANAGE to (Res.string.perm_working_hours_manage to Res.string.perm_working_hours_manage_sub),
    Permission.SERVICES_MANAGE to (Res.string.perm_services_manage to Res.string.perm_services_manage_sub),
    Permission.STAFF_MANAGE to (Res.string.perm_staff_manage to Res.string.perm_staff_manage_sub),
    Permission.POLICIES_MANAGE to (Res.string.perm_policies_manage to Res.string.perm_policies_manage_sub),
    Permission.REVIEWS_VIEW to (Res.string.perm_reviews_view to Res.string.perm_reviews_view_sub),
    Permission.STATISTICS_VIEW to (Res.string.perm_statistics_view to Res.string.perm_statistics_view_sub),
    Permission.FINANCE_VIEW to (Res.string.perm_finance_view to Res.string.perm_finance_view_sub),
    Permission.SUBSCRIPTION_VIEW to (Res.string.perm_subscription_view to Res.string.perm_subscription_view_sub),
)

internal fun Permission.copy(): Pair<StringResource, StringResource>? = PERMISSION_COPY[this]

internal fun OwnerCapability.title(): StringResource = when (this) {
    OwnerCapability.TEAM_MANAGE -> Res.string.cap_team_manage
    OwnerCapability.PAYOUT_DETAILS_MANAGE -> Res.string.cap_payout_details_manage
    OwnerCapability.SALON_DELETE_REQUEST -> Res.string.cap_salon_delete_request
    OwnerCapability.BRANCHES_MANAGE -> Res.string.cap_branches_manage
}

internal fun PermissionGroup.title(): StringResource = when (this) {
    PermissionGroup.BOOKINGS -> Res.string.group_bookings
    PermissionGroup.SALON -> Res.string.group_salon
    PermissionGroup.STAFF -> Res.string.group_staff
    PermissionGroup.FINANCE -> Res.string.group_finance
    PermissionGroup.INSIGHTS -> Res.string.group_insights
}
