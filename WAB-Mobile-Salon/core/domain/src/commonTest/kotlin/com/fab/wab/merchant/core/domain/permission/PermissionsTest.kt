package com.fab.wab.merchant.core.domain.permission

import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** MER-009: PRD §6 rules — owner has everything, others exactly their keys, guests nothing. */
class PermissionsTest {
    private fun member(role: MemberRole) = MemberProfile("m1", "s1", "Rami", role)

    @Test
    fun ownerHoldsEveryPermissionAndOwnerOnlyCapability() {
        val owner = SessionState.SignedIn(member(MemberRole.OWNER), permissions = emptySet()).permissionSet()
        Permission.entries.forEach { assertTrue(owner.has(it), it.name) }
        OwnerCapability.entries.forEach { assertTrue(owner.can(it), it.name) }
    }

    @Test
    fun managersAndEmployeesHoldExactlyTheirKeys() {
        val set = SessionState.SignedIn(member(MemberRole.MANAGER), setOf("BOOKINGS_RESPOND", "NOT_A_KEY")).permissionSet()
        assertTrue(set.has(Permission.BOOKINGS_RESPOND))
        assertFalse(set.has(Permission.FINANCE_VIEW))
        assertEquals(setOf(Permission.BOOKINGS_RESPOND), set.granted, "unknown server keys are ignored")
        assertTrue(set.anyOf(Permission.FINANCE_VIEW, Permission.BOOKINGS_RESPOND))
        assertFalse(set.allOf(Permission.FINANCE_VIEW, Permission.BOOKINGS_RESPOND))
        assertFalse(set.can(OwnerCapability.TEAM_MANAGE), "owner-only capabilities are never granted")
    }

    @Test
    fun guestsHoldNothing() {
        assertEquals(PermissionSet.NONE, SessionState.Guest.permissionSet())
        assertFalse(PermissionSet.NONE.has(Permission.DASHBOARD_VIEW))
    }

    @Test
    fun defaultTemplatesFollowPrd63() {
        assertEquals(13, PermissionTemplates.MANAGER.size)
        assertFalse(Permission.FINANCE_VIEW in PermissionTemplates.MANAGER)
        assertFalse(Permission.POLICIES_MANAGE in PermissionTemplates.MANAGER)
        assertEquals(setOf(Permission.BOOKINGS_VIEW_OWN, Permission.REVIEWS_VIEW), PermissionTemplates.forRole(MemberRole.EMPLOYEE))
        assertEquals(15, PermissionTemplates.forRole(MemberRole.OWNER).size)
    }
}
