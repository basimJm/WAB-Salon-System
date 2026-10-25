package com.fab.wab.merchant.core.network.auth

import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** MER-009: the merchant refresh carries the member, which is how permissions are re-fetched. */
class RefreshMemberTest {
    @Test
    fun completeMemberMapsToTheProfile() {
        val dto = RefreshMemberDto(id = "m1", salonId = "s1", firstName = "Rami", role = "MANAGER", permissions = listOf("DASHBOARD_VIEW"))
        assertEquals(MemberProfile("m1", "s1", "Rami", MemberRole.MANAGER), dto.toProfile())
    }

    @Test
    fun branchIsKeptForBranchMembersOnly() {
        val manager = RefreshMemberDto(id = "m2", salonId = "s1", firstName = "Rana", role = "MANAGER", branchId = "b2")
        assertEquals("b2", manager.toProfile()?.branchId)
        assertNull(manager.copy(role = "OWNER").toProfile()?.branchId, "the owner works across every branch")
        assertNull(manager.copy(branchId = " ").toProfile()?.branchId)
    }

    @Test
    fun incompleteMemberIsIgnored() {
        assertNull(RefreshMemberDto(id = "m1", salonId = null, role = "OWNER").toProfile())
        assertNull(RefreshMemberDto(id = "m1", salonId = "s1", role = "ADMIN").toProfile())
    }
}
