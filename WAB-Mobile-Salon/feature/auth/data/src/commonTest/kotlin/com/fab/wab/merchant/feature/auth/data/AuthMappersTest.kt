package com.fab.wab.merchant.feature.auth.data

import com.fab.wab.merchant.core.data.contract.generated.MemberProfile
import com.fab.wab.merchant.core.data.contract.generated.PostAuthLoginData
import com.fab.wab.merchant.core.data.contract.generated.PostAuthOtpRequestData
import com.fab.wab.merchant.core.domain.session.MemberRole
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
        val blocked = PostAuthOtpRequestData(allowed = false, otpLength = 6, resendAfterSeconds = 60, blockedUntil = "2026-10-22T10:00:00Z")
        assertEquals(6, blocked.toDomain().otpLength)
        assertEquals("2026-10-22T10:00:00Z", blocked.toDomain().blockedUntil.toString())
        assertNull(blocked.copy(blockedUntil = "not-a-date").toDomain().blockedUntil)
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
}
