package com.fab.wab.merchant.feature.team.data

import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersDataItem
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.feature.team.domain.MemberDraft
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TeamMappersTest {

    @Test
    fun membersMapRolesAndKnownPermissions() {
        val member = GetTeamMembersDataItem("m1", "Rana", "Ali", "+962791234567", " ", "manager", listOf("SERVICES_MANAGE", "SOMETHING_NEW"), true, false).toDomain()
        assertEquals(MemberRole.MANAGER, member.role)
        assertEquals(setOf(Permission.SERVICES_MANAGE), member.permissions)
        assertNull(member.photoUrl)
    }

    @Test
    fun patchCarriesNamesRoleAndOnlyAChangedPhoto() {
        val draft = MemberDraft(" Rana ", "Ali", role = MemberRole.EMPLOYEE)
        val unchanged = draft.toPatch(photoChanged = false, permissions = null)
        assertEquals(JsonPrimitive("Rana"), unchanged["firstName"])
        assertEquals(JsonPrimitive("EMPLOYEE"), unchanged["role"])
        assertNull(unchanged["photoKey"])
        assertNull(unchanged["permissions"])
        val removed = draft.toPatch(photoChanged = true, permissions = setOf(Permission.REVIEWS_VIEW))
        assertEquals(JsonNull, removed["photoKey"])
        assertEquals(JsonArray(listOf(JsonPrimitive("REVIEWS_VIEW"))), removed["permissions"])
    }
}
