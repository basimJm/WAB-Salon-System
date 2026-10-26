package com.fab.wab.customer.feature.salon.data

import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdDataServicesItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdStaffByMemberIdDataWorkingDaysItem
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.core.domain.salon.DayOfWeek
import com.fab.wab.customer.core.domain.salon.MemberRole
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.StaffServiceRef
import com.fab.wab.customer.feature.salon.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class StaffMappersTest {
    @Test
    fun workingDaysAndRolesMapWithFallbacks() {
        val custom = GetSalonsBySalonIdStaffByMemberIdDataWorkingDaysItem("MON", "09:00", "17:00").toDomain()
        assertEquals(DayOfWeek.MON, custom.day)
        assertEquals(OpeningHours("09:00", "17:00"), custom.hours)
        assertNull(GetSalonsBySalonIdStaffByMemberIdDataWorkingDaysItem("TUE", null, null).toDomain().hours)
        assertEquals(MemberRole.MANAGER, MemberRole.fromCode("manager"))
        assertEquals(MemberRole.EMPLOYEE, MemberRole.fromCode("role"))
    }

    @Test
    fun theStaffSheetKeepsTheBrideOnlyFlagOfEachService() {
        val member = decodeFixture("GetSalonsBySalonIdStaffByMemberId", GetSalonsBySalonIdStaffByMemberIdData.serializer()).data
        val vip = member.copy(
            services = listOf(
                GetSalonsBySalonIdStaffByMemberIdDataServicesItem("s1", "c1", "Hair", brideOnly = false),
                GetSalonsBySalonIdStaffByMemberIdDataServicesItem("s2", "c2", "Bridal makeup", brideOnly = true),
            ),
        ).toDomain()
        assertEquals(
            listOf(StaffServiceRef("s1", "c1", "Hair", false), StaffServiceRef("s2", "c2", "Bridal makeup", true)),
            vip.services,
        )
    }
}
