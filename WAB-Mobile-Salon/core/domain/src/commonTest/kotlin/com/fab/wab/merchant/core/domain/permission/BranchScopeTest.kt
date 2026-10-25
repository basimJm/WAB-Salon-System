package com.fab.wab.merchant.core.domain.permission

import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.core.domain.session.SessionState
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** MER-061: BUSINESS_DOMAIN §6 branch scope — owner = all branches, other members = one branch without salon-wide keys. */
class BranchScopeTest {

    @Test
    fun ownerWorksAcrossAllBranchesAndOthersInOne() {
        assertEquals(MemberScope.AllBranches, MemberProfile("m1", "s1", "Huda", MemberRole.OWNER).scope)
        assertEquals(MemberScope.OneBranch("b2"), MemberProfile("m2", "s1", "Rami", MemberRole.MANAGER, branchId = "b2").scope)
        assertEquals(MemberScope.OneBranch(null), MemberProfile("m3", "s1", "Lina", MemberRole.EMPLOYEE).scope)
    }

    @Test
    fun branchMembersNeverHoldSalonWidePermissionsEvenWhenSent() {
        val keys = setOf("FINANCE_VIEW", "SUBSCRIPTION_VIEW", "POLICIES_MANAGE", "BOOKINGS_RESPOND")
        val manager = SessionState.SignedIn(MemberProfile("m2", "s1", "Rami", MemberRole.MANAGER, "b2"), keys).permissionSet()
        assertTrue(manager.isBranchMember)
        assertTrue(manager.has(Permission.BOOKINGS_RESPOND))
        BranchPermissions.OWNER_SCOPE_ONLY.forEach { assertFalse(manager.has(it), it.name) }
        assertFalse(manager.can(OwnerCapability.BRANCHES_MANAGE))
    }

    @Test
    fun ownerKeepsSalonWidePermissionsAndBranchManagement() {
        val owner = SessionState.SignedIn(MemberProfile("m1", "s1", "Huda", MemberRole.OWNER)).permissionSet()
        assertFalse(owner.isBranchMember)
        BranchPermissions.OWNER_SCOPE_ONLY.forEach { assertTrue(owner.has(it), it.name) }
        assertTrue(owner.can(OwnerCapability.BRANCHES_MANAGE))
    }

    @Test
    fun managerTemplateIsEveryGrantableBranchPermission() {
        assertEquals(BranchPermissions.GRANTABLE, PermissionTemplates.MANAGER)
        BranchPermissions.OWNER_SCOPE_ONLY.forEach { assertFalse(it in BranchPermissions.GRANTABLE, it.name) }
        assertEquals(Permission.entries.size, BranchPermissions.GRANTABLE.size + BranchPermissions.OWNER_SCOPE_ONLY.size)
    }
}
