package com.fab.wab.merchant.feature.application.data

import com.fab.wab.merchant.core.data.contract.generated.GetSalonApplicationData
import com.fab.wab.merchant.core.data.contract.generated.MemberProfile as MemberDto
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.feature.application.data.repository.toApplyBody
import com.fab.wab.merchant.feature.application.data.repository.toDomain
import com.fab.wab.merchant.feature.application.domain.model.RegistrationForm
import com.fab.wab.merchant.feature.application.domain.model.SalonGender
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ApplicationMappersTest {
    @Test
    fun applyBodyCarriesTheSalonOwnerDocumentsAndInstallation() {
        val form = RegistrationForm("Gents", SalonGender.MEN, "Omar", "Ali", "c1", "a1", listOf("l/1.pdf", "l/2.jpg"))
        val body = form.toApplyBody(PhoneNumber("JO", "791234567"), "proof", InstallationInfo("inst-123456", "ANDROID", "1.0"))
        assertEquals("MALE", body.salon.gender)
        assertEquals("c1", body.salon.cityId)
        assertEquals(listOf("l/1.pdf", "l/2.jpg"), body.documentKeys)
        assertEquals("inst-123456", body.installation.installationId)
        assertEquals("JO", body.phone.countryCode)
    }

    @Test
    fun applicationStateReasonAndDatesAreParsedLeniently() {
        val rejected = GetSalonApplicationData("s1", "APPLICATION_REJECTED", "2026-10-20T08:00:00Z", 1.0, "Blurry license").toDomain()
        assertEquals(SalonState.APPLICATION_REJECTED, rejected.state)
        assertEquals("Blurry license", rejected.rejectionReason)
        assertEquals(1, rejected.resubmissionCount)
        val odd = GetSalonApplicationData("s1", "SOMETHING", "not-a-date", 0.0, " ").toDomain()
        assertEquals(SalonState.APPLICATION_PENDING, odd.state)
        assertNull(odd.submittedAt)
        assertNull(odd.rejectionReason)
    }

    @Test
    fun applicationMemberIsTheSharedProfileWithAConservativeRoleFallback() {
        // MER-068: contract 1.4.0 declares the application `member` as MemberProfile (SRV-151).
        val owner = MemberDto("m1", "s1", "Lina", "Haddad", "+962791234567", "OWNER", listOf("DASHBOARD_VIEW"), false).toDomain()
        assertEquals(MemberRole.OWNER, owner.role)
        assertEquals("Lina", owner.firstName)
        assertNull(owner.branchId)
        val odd = MemberDto("m2", "s1", "X", "Y", "+962791234568", "SUPERUSER", emptyList(), true, branchId = "b1").toDomain()
        assertEquals(MemberRole.EMPLOYEE, odd.role)
        assertEquals("b1", odd.branchId)
    }
}
