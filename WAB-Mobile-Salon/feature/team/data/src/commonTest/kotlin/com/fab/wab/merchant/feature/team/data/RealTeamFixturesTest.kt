package com.fab.wab.merchant.feature.team.data

import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdData
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdStaffData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersData
import com.fab.wab.merchant.core.data.contract.generated.PostTeamMembersByIdDeactivateData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the team mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealTeamFixturesTest {

    @Test
    fun membersStaffProfileAndActionsMap() {
        val members = decodeFixture("GetTeamMembers", serializer<List<GetTeamMembersDataItem>>()).data
        assertTrue(members.isNotEmpty())
        assertEquals(members.size, members.mapNotNull { it.toDomain() }.size)
        assertTrue(members.any { it.branchId != null } && members.any { it.role == "OWNER" && it.branchId == null })
        assertNotNull(decodeFixture("GetTeamMembersById", serializer<GetTeamMembersByIdData>()).data.toDomain())
        assertNotNull(decodeFixture("GetTeamMembersByIdStaff", serializer<GetTeamMembersByIdStaffData>()).data.toDomain())
        assertNotNull(decodeFixture("PostTeamMembers", serializer<PostTeamMembersData>()).data.toDomain())
        val deactivated = decodeFixture("PostTeamMembersByIdDeactivate", serializer<PostTeamMembersByIdDeactivateData>()).data
        assertEquals(false, deactivated.active)
        assertNotNull(deactivated.toDomain())
    }
}
