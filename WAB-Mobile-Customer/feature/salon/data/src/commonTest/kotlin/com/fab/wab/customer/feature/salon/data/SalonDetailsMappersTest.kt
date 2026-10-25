package com.fab.wab.customer.feature.salon.data

import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataBranchesItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataBranchesItemLocation
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataBranchesItemTodayHours
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataBranchesItemUpcomingClosuresItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataBranchesItemWeeklyScheduleItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataGalleryItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataReviewsLatestItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataReviewsLatestItemBranch
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataServicesItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataStaffItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataWeeklyScheduleItem
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.Closure
import com.fab.wab.customer.core.domain.salon.DayOfWeek
import com.fab.wab.customer.core.domain.salon.MediaType
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.feature.salon.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SalonDetailsMappersTest {

    @Test
    fun scheduleStaffAndGalleryCodesMapWithSafeFallbacks() {
        val off = GetSalonsBySalonIdDataWeeklyScheduleItem("FRI", isOff = true, open = "08:00", close = "16:00").toDomain()
        assertEquals(DayOfWeek.FRI, off.day)
        assertNull(off.hours)
        val open = GetSalonsBySalonIdDataWeeklyScheduleItem("day", isOff = false, open = "08:00", close = "16:00").toDomain()
        assertNull(open.day)
        assertEquals(OpeningHours("08:00", "16:00"), open.hours)
        assertEquals(StaffStatus.ON_DUTY, GetSalonsBySalonIdDataStaffItem("m1", "Omar", null, "on_duty").toDomain().status)
        assertEquals(StaffStatus.DAY_OFF, GetSalonsBySalonIdDataStaffItem("m1", "Omar", null, "status").toDomain().status)
        assertEquals(MediaType.VIDEO, GetSalonsBySalonIdDataGalleryItem("g1", "VIDEO", "u", null, 3.0).toDomain().type)
        assertEquals(MediaType.IMAGE, GetSalonsBySalonIdDataGalleryItem("g1", "type", "u", null, null).toDomain().type)
    }

    @Test
    fun branchMapsItsOwnPlaceContactsHoursAndClosures() {
        val branch = GetSalonsBySalonIdDataBranchesItem(
            id = "b2", name = "Mecca Street", isMain = false, locationText = " ",
            location = GetSalonsBySalonIdDataBranchesItemLocation(31.95, 35.86), phone = "+962790000001", whatsapp = "",
            isOpenNow = false, todayHours = GetSalonsBySalonIdDataBranchesItemTodayHours("10:00", "18:00"), closedReason = "Holiday",
            weeklySchedule = listOf(GetSalonsBySalonIdDataBranchesItemWeeklyScheduleItem("SAT", isOff = true, open = "", close = "")),
            upcomingClosures = listOf(GetSalonsBySalonIdDataBranchesItemUpcomingClosuresItem("2026-11-01", "2026-11-02", "Works")),
        ).toDomain()
        assertEquals("Mecca Street", branch.name)
        assertNull(branch.locationText)
        assertNull(branch.whatsapp)
        assertEquals("+962790000001", branch.phone)
        assertEquals(LocationData(31.95, 35.86), branch.location)
        assertEquals(OpeningHours("10:00", "18:00"), branch.todayHours)
        assertEquals(DayOfWeek.SAT, branch.weeklySchedule.single().day)
        assertNull(branch.weeklySchedule.single().hours)
        assertEquals(listOf(Closure("2026-11-01", "2026-11-02", "Works")), branch.upcomingClosures)
    }

    @Test
    fun staffServicesAndReviewsKeepTheirBranch() {
        assertEquals("b1", GetSalonsBySalonIdDataStaffItem("m1", "Omar", null, "ON_DUTY", branchId = "b1").toDomain().branchId)
        val service = GetSalonsBySalonIdDataServicesItem(
            id = "s1", branchId = "b2", catalogServiceId = "c1", name = "Cut", imageUrl = "", price = "8",
            durationMinutes = 30.0, mediaUrls = emptyList(),
        ).toDomain()
        assertEquals("b2", service.branchId)
        val labelled = GetSalonsBySalonIdDataReviewsLatestItem(
            "r1", "Lina", 5.0, null, "2026-10-01T10:00:00Z", GetSalonsBySalonIdDataReviewsLatestItemBranch("b2", "Khalda"),
        ).toDomain()
        assertEquals(BranchRef("b2", "Khalda"), labelled.branch)
        assertNull(GetSalonsBySalonIdDataReviewsLatestItem("r2", "Lina", 4.0, null, "2026-10-01T10:00:00Z").toDomain().branch)
    }
}
