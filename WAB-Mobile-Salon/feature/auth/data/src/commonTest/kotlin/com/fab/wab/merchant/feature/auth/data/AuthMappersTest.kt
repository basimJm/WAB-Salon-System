package com.fab.wab.merchant.feature.auth.data

import com.fab.wab.merchant.core.data.contract.generated.MemberProfile
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpVerifyData
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.feature.auth.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AuthMappersTest {
    private val member = MemberProfile(
        id = "m1", salonId = "s1", firstName = "Lina", lastName = "H", phone = "+962791234567",
        role = "MANAGER", permissions = listOf("DASHBOARD_VIEW", "BOOKINGS_VIEW_ALL"), providesServices = true,
    )

    @Test
    fun otpPolicyParsesTheBlockTimestampLeniently() {
        val blocked = PostAuthOtpRequestData(
            allowed = false, otpLength = 6, resendAfterSeconds = 60, expiresInSeconds = 0, blockedUntil = "2026-10-22T10:00:00Z",
        )
        assertEquals(6, blocked.toDomain().otpLength)
        assertEquals(0, blocked.toDomain().expiresInSeconds)
        assertEquals("2026-10-22T10:00:00Z", blocked.toDomain().blockedUntil.toString())
        assertNull(blocked.copy(blockedUntil = "not-a-date").toDomain().blockedUntil)
    }

    @Test
    fun otpRequestCarriesTheCodeLifetimeAndVerifyTheSingleUseToken() {
        val sent = PostAuthOtpRequestData(allowed = true, otpLength = 6, resendAfterSeconds = 60, expiresInSeconds = 300).toDomain()
        assertEquals(300, sent.expiresInSeconds)
        assertNull(sent.blockedUntil)
        val proof = PostAuthOtpVerifyData(otpToken = "otp-1", expiresInSeconds = 600).toDomain()
        assertEquals("otp-1", proof.otpToken)
        assertEquals(600, proof.expiresInSeconds)
    }

    @Test
    fun loginDataBecomesASessionWithMemberAndPermissionKeys() {
        val session = PostAuthLoginData("a", "t1", "r", "t2", member).toDomain()
        assertEquals("a", session.tokens.accessToken)
        assertEquals("r", session.tokens.refreshToken)
        assertEquals("s1", session.member.salonId)
        assertEquals(MemberRole.MANAGER, session.member.role)
        assertEquals(setOf("DASHBOARD_VIEW", "BOOKINGS_VIEW_ALL"), session.permissions)
    }

    @Test
    fun unknownRoleIsTheMostRestricted() {
        assertEquals(MemberRole.EMPLOYEE, member.copy(role = "SUPERVISOR").toDomain().role)
    }

    @Test
    fun branchMemberSignsInScopedToTheirBranch() {
        val session = PostAuthLoginData("a", "t1", "r", "t2", member.copy(branchId = "b-khalda")).toDomain()
        assertEquals("b-khalda", session.member.branchId)
        assertEquals(MemberScope.OneBranch("b-khalda"), session.member.scope)
    }

    @Test
    fun ownerSignsInForAllBranches() {
        val owner = member.copy(role = "OWNER", branchId = "b-main").toDomain()
        assertNull(owner.branchId)
        assertEquals(MemberScope.AllBranches, owner.scope)
    }

    @Test
    fun blankBranchIdIsNoBranch() {
        assertNull(member.copy(branchId = " ").toDomain().branchId)
    }
}
