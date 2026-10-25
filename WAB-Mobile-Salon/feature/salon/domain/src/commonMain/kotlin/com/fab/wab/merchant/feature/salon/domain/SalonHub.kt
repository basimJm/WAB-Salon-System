package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.permission.OwnerCapability
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import com.fab.wab.merchant.core.domain.salon.CompletenessItem

/** PRD M12 management entries: the permission that shows each one and the completeness items it fixes. */
enum class HubTile(val permission: Permission, val fixes: Set<CompletenessItem> = emptySet()) {
    PROFILE(
        Permission.SALON_PROFILE_MANAGE,
        setOf(
            CompletenessItem.COVER, CompletenessItem.PROFILE_IMAGE, CompletenessItem.NAME,
            CompletenessItem.DESCRIPTION, CompletenessItem.LOCATION, CompletenessItem.PHONE,
        ),
    ),
    GALLERY(Permission.GALLERY_MANAGE),
    HOURS(Permission.WORKING_HOURS_MANAGE, setOf(CompletenessItem.WORKING_HOURS)),
    SERVICES(Permission.SERVICES_MANAGE, setOf(CompletenessItem.SERVICE)),
    TEAM(Permission.STAFF_MANAGE, setOf(CompletenessItem.STAFF)),
    POLICIES(Permission.POLICIES_MANAGE, setOf(CompletenessItem.POLICY)),
    REVIEWS(Permission.REVIEWS_VIEW),
    STATISTICS(Permission.STATISTICS_VIEW),
    FINANCE(Permission.FINANCE_VIEW),
    SUBSCRIPTION(Permission.SUBSCRIPTION_VIEW),
}

/** One visible tile and whether it still blocks going LIVE ("Missing"). */
data class HubEntry(val tile: HubTile, val missing: Boolean)

/** Hidden, not disabled (PRD §6): only tiles the member may open; the team tile also shows for `TEAM_MANAGE` (owner). */
fun hubEntries(permissions: PermissionSet, missing: Set<CompletenessItem>): List<HubEntry> =
    HubTile.entries
        .filter { tile -> permissions.has(tile.permission) || (tile == HubTile.TEAM && permissions.can(OwnerCapability.TEAM_MANAGE)) }
        .map { tile -> HubEntry(tile, tile.fixes.any { it in missing }) }
