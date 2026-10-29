package com.fab.wab.customer.feature.salon.data

import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdReviewsData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.feature.salon.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** CUS-060: salon details, staff sheet and reviews captured from the dev API. */
class RealSalonFixturesTest {

    @Test
    fun realSalonDetailsMapBranchesServicesStaffAndHours() {
        val salon = decodeFixture("GetSalonsBySalonId", GetSalonsBySalonIdData.serializer()).data.toDomain()
        assertTrue(salon.branches.isNotEmpty())
        assertEquals(1, salon.branches.count { it.isMain }, "exactly one main branch")
        assertTrue(salon.services.isNotEmpty() && salon.services.all { it.price.toDouble() > 0 && it.durationMinutes > 0 })
        assertTrue(salon.staff.isNotEmpty())
        assertEquals(DAYS_PER_WEEK, salon.weeklySchedule.size)
        assertTrue(salon.weeklySchedule.all { it.day != null }, "every weekly day code is known")
        assertEquals(BusinessType.SALON, salon.businessType, "contract 1.10.0 migration: every legacy business is a salon")
        assertEquals(Audience.FEMALE, salon.audience)
        assertTrue(salon.allowsBride)
    }

    @Test
    fun realStaffSheetMapsRoleStatusAndWorkingDays() {
        val raw = decodeFixture("GetSalonsBySalonIdStaffByMemberId", GetSalonsBySalonIdStaffByMemberIdData.serializer()).data
        val staff = raw.toDomain()
        assertTrue(staff.firstName.isNotBlank())
        assertEquals(raw.role, staff.role.code, "role is a known code, not the EMPLOYEE fallback")
        assertEquals(raw.status, staff.status.code, "status is a known code, not the DAY_OFF fallback")
        assertTrue(staff.workingDays.isNotEmpty() && staff.workingDays.all { it.day != null })
    }

    @Test
    fun realReviewsPageMaps() {
        val page = decodeFixture("GetSalonsBySalonIdReviews", GetSalonsBySalonIdReviewsData.serializer()).data.toDomain()
        assertTrue(page.items.all { it.rating in 1f..5f })
    }

    private companion object {
        const val DAYS_PER_WEEK = 7
    }
}
