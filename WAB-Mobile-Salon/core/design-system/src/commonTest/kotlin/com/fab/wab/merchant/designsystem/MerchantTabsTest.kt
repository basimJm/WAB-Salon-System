package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.designsystem.components.navigation.MerchantTab
import com.fab.wab.merchant.designsystem.components.navigation.defaultMerchantTab
import com.fab.wab.merchant.designsystem.components.navigation.resolveMerchantTab
import com.fab.wab.merchant.designsystem.components.navigation.visibleMerchantTabs
import kotlin.test.Test
import kotlin.test.assertEquals

class MerchantTabsTest {
    private fun member(role: MemberRole, vararg granted: Permission) = PermissionSet(role, granted.toSet())

    @Test
    fun ownerSeesAllFiveTabsAndStartsOnHome() {
        val owner = member(MemberRole.OWNER)
        assertEquals(MerchantTab.entries, visibleMerchantTabs(owner))
        assertEquals(MerchantTab.HOME, defaultMerchantTab(owner))
    }

    @Test
    fun employeeWithoutDashboardStartsOnTheFirstVisibleTab() {
        val employee = member(MemberRole.EMPLOYEE, Permission.BOOKINGS_VIEW_OWN, Permission.REVIEWS_VIEW)
        assertEquals(
            listOf(MerchantTab.BOOKINGS, MerchantTab.CALENDAR, MerchantTab.SALON, MerchantTab.MORE),
            visibleMerchantTabs(employee),
        )
        assertEquals(MerchantTab.BOOKINGS, defaultMerchantTab(employee))
    }

    @Test
    fun noPermissionsLeavesOnlyMore() {
        val none = member(MemberRole.EMPLOYEE)
        assertEquals(listOf(MerchantTab.MORE), visibleMerchantTabs(none))
        assertEquals(MerchantTab.MORE, defaultMerchantTab(none))
        assertEquals(listOf(MerchantTab.MORE), visibleMerchantTabs(PermissionSet.NONE))
    }

    @Test
    fun managementPermissionsShowTheSalonTab() {
        val manager = member(MemberRole.MANAGER, Permission.DASHBOARD_VIEW, Permission.FINANCE_VIEW)
        assertEquals(listOf(MerchantTab.HOME, MerchantTab.SALON, MerchantTab.MORE), visibleMerchantTabs(manager))
    }

    @Test
    fun selectedTabFallsBackWhenItsPermissionIsRevoked() {
        val withBookings = member(MemberRole.MANAGER, Permission.DASHBOARD_VIEW, Permission.BOOKINGS_VIEW_ALL)
        val revoked = member(MemberRole.MANAGER, Permission.DASHBOARD_VIEW)
        assertEquals(MerchantTab.CALENDAR, resolveMerchantTab(MerchantTab.CALENDAR, withBookings))
        assertEquals(MerchantTab.HOME, resolveMerchantTab(MerchantTab.CALENDAR, revoked))
        assertEquals(MerchantTab.HOME, resolveMerchantTab(null, revoked))
    }

    @Test
    fun idsRoundTrip() {
        MerchantTab.entries.forEach { assertEquals(it, MerchantTab.fromId(it.name)) }
        assertEquals(null, MerchantTab.fromId("unknown"))
    }
}
