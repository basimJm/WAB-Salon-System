package com.fab.wab.merchant.feature.bookings.data

import com.fab.wab.merchant.core.data.contract.generated.GetBookingsCalendarDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursDataClosuresItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursDataToday
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursDataWeeklyScheduleItem
import com.fab.wab.merchant.core.domain.booking.BookingStatus
import com.fab.wab.merchant.feature.bookings.data.repository.toDomain
import com.fab.wab.merchant.feature.bookings.domain.model.DayHours
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class CalendarMappersTest {

    @Test
    fun calendarRowsMapAndBadRowsDrop() {
        val row = GetBookingsCalendarDataItem("b1", "WAB-1", "APPROVED", "s1", "Rana", true, "2026-10-24T07:00:00Z", "2026-10-24T08:00:00Z")
        val entry = row.toDomain()
        assertEquals(BookingStatus.APPROVED, entry?.status)
        assertEquals(true, entry?.isBride)
        assertNull(row.copy(status = "WHATEVER").toDomain())
        assertNull(row.copy(end = "later").toDomain())
    }

    @Test
    fun hoursMapDaysOffAndClosures() {
        val data = GetSalonHoursData(
            weeklySchedule = listOf(
                GetSalonHoursDataWeeklyScheduleItem("SAT", false, "09:00", "21:30"),
                GetSalonHoursDataWeeklyScheduleItem("FRI", true, "00:00", "00:00"),
                GetSalonHoursDataWeeklyScheduleItem("SUN", false, "10:00", "09:00"),
                GetSalonHoursDataWeeklyScheduleItem("XYZ", false, "09:00", "17:00"),
            ),
            closures = listOf(
                GetSalonHoursDataClosuresItem("c1", "2026-10-26", "2026-10-27", "Maintenance", true),
                GetSalonHoursDataClosuresItem("c2", "2026-11-01T00:00:00Z", "bad", "Eid", false),
            ),
            today = GetSalonHoursDataToday("2026-10-24", false, null, "09:00", "21:30", true),
        )
        val hours = data.toDomain()
        assertEquals(DayHours(SAT_OPEN, SAT_CLOSE), hours.weekly[DayOfWeek.SATURDAY])
        assertNull(hours.weekly[DayOfWeek.FRIDAY])
        assertNull(hours.weekly[DayOfWeek.SUNDAY])
        assertEquals(3, hours.weekly.size)
        assertNull(hours.hoursOn(LocalDate(2026, 10, 27)))
        assertEquals("Eid", hours.closureOn(LocalDate(2026, 11, 1))?.reason)
    }

    private companion object {
        const val SAT_OPEN = 540
        const val SAT_CLOSE = 1_290
    }
}
