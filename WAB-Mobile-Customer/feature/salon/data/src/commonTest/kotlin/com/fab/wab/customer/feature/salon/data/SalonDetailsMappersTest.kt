package com.fab.wab.customer.feature.salon.data

import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataGalleryItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataStaffItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsBySalonIdDataWeeklyScheduleItem
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
}
