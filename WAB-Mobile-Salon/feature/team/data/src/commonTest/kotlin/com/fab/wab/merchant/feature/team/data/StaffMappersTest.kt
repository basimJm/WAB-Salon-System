package com.fab.wab.merchant.feature.team.data

import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdStaffData
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdStaffDataRating
import com.fab.wab.merchant.core.data.contract.generated.GetTeamMembersByIdStaffDataWorkingDaysItem
import com.fab.wab.merchant.feature.team.domain.StaffDay
import com.fab.wab.merchant.feature.team.domain.StaffDraft
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.serialization.json.JsonNull
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class StaffMappersTest {

    @Test
    fun profileMapsDaysWithAndWithoutCustomHours() {
        val profile = GetTeamMembersByIdStaffData(
            memberId = "m1", providesServices = true, bio = null, yearsOfExperience = 3.0, serviceIds = listOf("s1"), brideQualified = true,
            workingDays = listOf(
                GetTeamMembersByIdStaffDataWorkingDaysItem("SAT", "10:00", "18:30"),
                GetTeamMembersByIdStaffDataWorkingDaysItem("SUN", null, null),
                GetTeamMembersByIdStaffDataWorkingDaysItem("XYZ", null, null),
            ),
            rating = GetTeamMembersByIdStaffDataRating(4.5, 10.0), customersCount = 42.0,
        ).toDomain()
        assertEquals(listOf(StaffDay(DayOfWeek.SATURDAY, 600, 1_110), StaffDay(DayOfWeek.SUNDAY)), profile.workingDays)
        assertEquals("", profile.bio)
        assertEquals(42, profile.customersCount)
    }

    @Test
    fun bodyWritesCustomHoursOnlyWhenBothEndsExist() {
        val body = StaffDraft(years = "", workingDays = listOf(StaffDay(DayOfWeek.MONDAY, 540, 900), StaffDay(DayOfWeek.FRIDAY))).toBody()
        assertNull(body.yearsOfExperience)
        assertEquals("MON", body.workingDays[0].day)
        assertEquals("09:00", body.workingDays[0].start)
        assertNull(body.workingDays[1].start)
        assertEquals(JsonNull, leavePatch(LocalDate(2026, 11, 1), LocalDate(2026, 11, 2), " ")["note"])
    }
}
