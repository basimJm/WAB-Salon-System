package com.fab.wab.merchant.feature.team.domain

import com.fab.wab.merchant.core.domain.permission.BranchPermissions
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.session.MemberRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** MER-065: a branch is required for new members, and branch members never see the salon-wide permissions. */
class TeamBranchesTest {
    private fun member(role: MemberRole) = TeamMember("m", "Rana", "Ali", "+962791234567", null, role, emptySet(), true, true, "b1")

    @Test
    fun branchIsRequiredOnlyWhenTheSalonHasBranchesToChooseFrom() {
        val draft = MemberDraft(firstName = "Rana", lastName = "Ali")
        assertEquals(setOf(MemberField.BRANCH), memberErrors(draft, isNew = true, phoneValid = true, branchRequired = true))
        assertTrue(memberErrors(draft.copy(branchId = "b1"), isNew = true, phoneValid = true, branchRequired = true).isEmpty())
        assertTrue(memberErrors(draft, isNew = true, phoneValid = true).isEmpty())
        assertEquals("b1", member(MemberRole.MANAGER).toDraft().branchId)
    }

    @Test
    fun editorHidesSalonWideKeysForBranchMembers() {
        val manager = member(MemberRole.MANAGER)
        val shown = PermissionGroup.entries.flatMap { it.visiblePermissions(manager) }
        BranchPermissions.OWNER_SCOPE_ONLY.forEach { assertFalse(it in shown, it.name) }
        assertEquals(BranchPermissions.GRANTABLE, shown.toSet())
        assertTrue(Permission.FINANCE_VIEW in PermissionGroup.FINANCE.visiblePermissions(member(MemberRole.OWNER)))
    }
}
