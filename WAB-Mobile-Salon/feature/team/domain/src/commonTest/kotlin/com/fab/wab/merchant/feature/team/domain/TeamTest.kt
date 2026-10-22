package com.fab.wab.merchant.feature.team.domain

import com.fab.wab.merchant.core.domain.session.MemberRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TeamTest {

    private fun member(role: MemberRole, provides: Boolean = true) =
        TeamMember("m", "Rana", "Ali", "+962791234567", null, role, emptySet(), active = true, providesServices = provides)

    @Test
    fun draftRules() {
        val draft = MemberDraft("Rana", "Ali")
        assertTrue(memberErrors(draft, isNew = false, phoneValid = false).isEmpty())
        assertEquals(setOf(MemberField.PHONE), memberErrors(draft, isNew = true, phoneValid = false))
        assertEquals(setOf(MemberField.FIRST_NAME, MemberField.LAST_NAME), memberErrors(MemberDraft(" ", "x".repeat(MemberLimits.NAME_MAX + 1)), false, true))
        assertEquals("Rana Ali", member(MemberRole.EMPLOYEE).fullName)
    }

    @Test
    fun ownerRowIsProtectedAndStaffManagersOnlyOpenProviders() {
        val owner = TeamAccess(manageTeam = true, manageStaff = true)
        assertFalse(owner.canEdit(member(MemberRole.OWNER)))
        assertFalse(owner.canToggleActive(member(MemberRole.OWNER)))
        assertTrue(owner.canEdit(member(MemberRole.MANAGER)))
        assertTrue(owner.canEditStaff(member(MemberRole.MANAGER, provides = false)))
        val staffManager = TeamAccess(manageTeam = false, manageStaff = true)
        assertFalse(staffManager.canAdd)
        assertFalse(staffManager.canEdit(member(MemberRole.EMPLOYEE)))
        assertTrue(staffManager.canEditStaff(member(MemberRole.EMPLOYEE)))
        assertFalse(staffManager.canEditStaff(member(MemberRole.EMPLOYEE, provides = false)))
    }
}
