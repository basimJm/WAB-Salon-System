package com.fab.wab.merchant.feature.more.data

import com.fab.wab.merchant.core.data.mock.decodeFixture
import com.fab.wab.merchant.core.domain.session.MemberRole
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** MER-054: the hand-written `/me` DTO on the real `GET /me`, `PATCH /me` and `POST /auth/change-phone` answers. */
class RealAccountFixturesTest {

    @Test
    fun ownerAccountMaps() {
        val me = decodeFixture("GetMe", serializer<MyAccountDto>()).data.toDomain()
        assertEquals(MemberRole.OWNER, me.role)
        assertNull(me.branchId)
    }

    @Test
    fun branchMemberAnswersCarryTheirBranch() {
        listOf("PatchMe", "PostAuthChangePhone").forEach { operation ->
            val account = decodeFixture(operation, serializer<MyAccountDto>()).data.toDomain()
            assertEquals(MemberRole.EMPLOYEE, account.role, operation)
            assertEquals(false, account.branchId.isNullOrBlank(), operation)
        }
    }
}
