package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursDataClosuresItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursDataToday
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursDataWeeklyScheduleItem
import com.fab.wab.merchant.feature.salon.domain.DaySchedule
import com.fab.wab.merchant.feature.salon.domain.SALON_WEEK
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals

class HoursMappersTest {

    @Test
    fun weekAndClosuresMapAndTimesRoundTrip() {
        val data = GetSalonHoursData(
            weeklySchedule = listOf(GetSalonHoursDataWeeklyScheduleItem("MON", false, "09:30", "24:00")),
            closures = listOf(
                GetSalonHoursDataClosuresItem("c2", "2026-11-03", "2026-11-04", "Eid", true),
                GetSalonHoursDataClosuresItem("c1", "2026-11-01T00:00:00Z", "", "Maintenance", false),
            ),
            today = GetSalonHoursDataToday("2026-10-24", false, null, null, null, false),
        ).toDomain()
        assertEquals(SALON_WEEK, data.week.map { it.day })
        assertEquals(DaySchedule(DayOfWeek.MONDAY, false, 570, 1_440), data.week.first { it.day == DayOfWeek.MONDAY })
        assertEquals(listOf("c1", "c2"), data.closures.map { it.id })
        assertEquals(LocalDate(2026, 11, 1), data.closures.first().to)
        assertEquals("09:30", hhmmOf(570))
        assertEquals("MON", DaySchedule(DayOfWeek.MONDAY, true, 0, 15).toBody().day)
    }
}
