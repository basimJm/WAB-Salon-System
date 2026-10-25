package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.permission.OwnerCapability
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import com.fab.wab.merchant.core.domain.salon.CompletenessItem

/**
 * PRD M12 management entries: the permission (or owner-only capability) that shows each one and the completeness items
 * it fixes.
 */
enum class HubTile(
    val permission: Permission?,
    val fixes: Set<CompletenessItem> = emptySet(),
    val capability: OwnerCapability? = null,
) {
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
    TEAM(Permission.STAFF_MANAGE, setOf(CompletenessItem.STAFF), OwnerCapability.TEAM_MANAGE),

    /** MER-062: owner-only branch management (BUSINESS_DOMAIN §6 `BRANCHES_MANAGE`). */
    BRANCHES(permission = null, capability = OwnerCapability.BRANCHES_MANAGE),
    POLICIES(Permission.POLICIES_MANAGE, setOf(CompletenessItem.POLICY)),
    REVIEWS(Permission.REVIEWS_VIEW),
    STATISTICS(Permission.STATISTICS_VIEW),
    FINANCE(Permission.FINANCE_VIEW),
    SUBSCRIPTION(Permission.SUBSCRIPTION_VIEW),
}

/** One visible tile and whether it still blocks going LIVE ("Missing"). */
data class HubEntry(val tile: HubTile, val missing: Boolean)

/** Hidden, not disabled (PRD §6): only tiles the member may open by permission or owner-only capability. */
fun hubEntries(permissions: PermissionSet, missing: Set<CompletenessItem>): List<HubEntry> =
    HubTile.entries
        .filter { tile -> tile.permission?.let(permissions::has) == true || tile.capability?.let(permissions::can) == true }
        .map { tile -> HubEntry(tile, tile.fixes.any { it in missing }) }
