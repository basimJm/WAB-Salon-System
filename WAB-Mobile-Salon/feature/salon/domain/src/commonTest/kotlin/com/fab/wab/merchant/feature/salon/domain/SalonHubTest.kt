package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet
import com.fab.wab.merchant.core.domain.salon.CompletenessItem
import com.fab.wab.merchant.core.domain.session.MemberRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SalonHubTest {

    @Test
    fun ownerSeesEveryTileWithMissingMarks() {
        val entries = hubEntries(PermissionSet(MemberRole.OWNER, emptySet()), setOf(CompletenessItem.SERVICE, CompletenessItem.COVER))
        assertEquals(HubTile.entries, entries.map { it.tile })
        assertEquals(setOf(HubTile.PROFILE, HubTile.SERVICES), entries.filter { it.missing }.map { it.tile }.toSet())
    }

    @Test
    fun managerSeesOnlyGrantedTiles() {
        val manager = PermissionSet(
            MemberRole.MANAGER,
            setOf(Permission.SERVICES_MANAGE, Permission.REVIEWS_VIEW, Permission.BOOKINGS_VIEW_ALL),
        )
        assertEquals(listOf(HubTile.SERVICES, HubTile.REVIEWS), hubEntries(manager, emptySet()).map { it.tile })
    }

    @Test
    fun employeeWithoutManagementSeesNothing() {
        val employee = PermissionSet(MemberRole.EMPLOYEE, setOf(Permission.BOOKINGS_VIEW_OWN))
        assertTrue(hubEntries(employee, setOf(CompletenessItem.STAFF)).isEmpty())
    }
}
