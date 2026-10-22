package com.fab.wab.merchant.designsystem.components.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import com.fab.wab.merchant.core.domain.permission.OwnerCapability
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.merchant_tab_bookings
import com.fab.wab.merchant.designsystem.resources.merchant_tab_calendar
import com.fab.wab.merchant.designsystem.resources.merchant_tab_home
import com.fab.wab.merchant.designsystem.resources.merchant_tab_more
import com.fab.wab.merchant.designsystem.resources.merchant_tab_salon
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** The five merchant tabs of PRD §8.1, in display order. */
enum class MerchantTab(internal val label: StringResource, internal val icon: () -> ImageVector) {
    HOME(Res.string.merchant_tab_home, { AppIcons.Home }),
    BOOKINGS(Res.string.merchant_tab_bookings, { AppIcons.Bookings }),
    CALENDAR(Res.string.merchant_tab_calendar, { AppIcons.Calendar }),
    SALON(Res.string.merchant_tab_salon, { AppIcons.Store }),
    MORE(Res.string.merchant_tab_more, { AppIcons.Menu }),
    ;

    /** PRD §8.1: a tab is shown only if permitted (hidden, never disabled). */
    fun isVisibleTo(permissions: PermissionSet): Boolean = when (this) {
        HOME -> permissions.has(Permission.DASHBOARD_VIEW)
        BOOKINGS, CALENDAR -> permissions.anyOf(Permission.BOOKINGS_VIEW_ALL, Permission.BOOKINGS_VIEW_OWN)
        SALON -> permissions.anyOf(*SALON_MANAGEMENT) || permissions.can(OwnerCapability.TEAM_MANAGE)
        MORE -> true
    }

    companion object {
        /** Any management permission opens the Salon hub (design 05 Salon, `MGMT`). */
        private val SALON_MANAGEMENT = arrayOf(
            Permission.SALON_PROFILE_MANAGE,
            Permission.GALLERY_MANAGE,
            Permission.WORKING_HOURS_MANAGE,
            Permission.SERVICES_MANAGE,
            Permission.STAFF_MANAGE,
            Permission.POLICIES_MANAGE,
            Permission.REVIEWS_VIEW,
            Permission.STATISTICS_VIEW,
            Permission.FINANCE_VIEW,
            Permission.SUBSCRIPTION_VIEW,
        )

        fun fromId(id: String?): MerchantTab? = entries.firstOrNull { it.name == id }
    }
}

/** Tabs the member may see, in order; More is always there, so the list is never empty. */
fun visibleMerchantTabs(permissions: PermissionSet): List<MerchantTab> =
    MerchantTab.entries.filter { it.isVisibleTo(permissions) }

/** PRD §8.1: Home when permitted, otherwise the first visible tab. */
fun defaultMerchantTab(permissions: PermissionSet): MerchantTab = visibleMerchantTabs(permissions).first()

/** Keeps [current] while it is still visible; after a permission change that hides it, falls back to the default. */
fun resolveMerchantTab(current: MerchantTab?, permissions: PermissionSet): MerchantTab =
    current?.takeIf { it.isVisibleTo(permissions) } ?: defaultMerchantTab(permissions)

/** Navigation items for [AppNavScaffold]; ids are the tab names ([MerchantTab.fromId] maps them back). */
@Composable
fun merchantNavItems(tabs: List<MerchantTab>, badges: Map<MerchantTab, Int> = emptyMap()): List<AppNavItem> =
    tabs.map { tab ->
        AppNavItem(id = tab.name, label = stringResource(tab.label), icon = tab.icon(), badgeCount = badges[tab] ?: 0)
    }
