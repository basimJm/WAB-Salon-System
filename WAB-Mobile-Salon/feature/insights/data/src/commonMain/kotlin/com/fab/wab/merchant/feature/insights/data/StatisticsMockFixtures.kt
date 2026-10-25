package com.fab.wab.merchant.feature.insights.data

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.mock.MockFixture

/** Koin name of the mock statistics (dev builds with `DATA_SOURCE=mock`). */
const val MOCK_STATISTICS_FIXTURE = "mockStatistics"

private fun day(date: String, bookings: String, revenue: String) = """{"date":"$date","bookings":$bookings,"revenue":"$revenue"}"""

/** One week of a busy salon (design 07 `stats`): KPIs, per-day series and rankings; the dates do not follow the query. */
private val STATISTICS_JSON =
    """{"success":true,"message":"","data":{"from":"2026-10-24","to":"2026-10-30","branchId":null,""" +
        """"bookings":{"total":38,"byStatus":{"PENDING":2,"APPROVED":9,"REJECTED":1,"CANCELLED_BY_CUSTOMER":2,""" +
        """"CANCELLED_BY_SALON":1,"AUTO_CANCELLED":0,"COMPLETED":22,"NO_SHOW":1},"approvalRate":94.7,""" +
        """"cancellationRate":7.9,"noShowRate":2.6,"averageResponseMinutes":6.5,"brideBookings":4,""" +
        """"revenue":{"online":"820.000","atSalon":"420.500","total":"1240.500"}},"profileViews":512,""" +
        """"reviews":{"new":9,"averageRating":4.8},"days":[""" +
        listOf(
            day("2026-10-24", "6", "190.000"),
            day("2026-10-25", "4", "120.500"),
            day("2026-10-26", "7", "230.000"),
            day("2026-10-27", "3", "95.000"),
            day("2026-10-28", "8", "260.000"),
            day("2026-10-29", "0", "0.000"),
            day("2026-10-30", "10", "345.000"),
        ).joinToString(",") + "]," +
        """"topServices":[{"id":"sv1","name":"__TEXT__","bookings":14},{"id":"sv2","name":"__TEXT__","bookings":9},""" +
        """{"id":"sv3","name":"__TEXT__","bookings":6}],"topStaff":[{"id":"s1","firstName":"Sara","bookings":15,"rating":4.9},""" +
        """{"id":"s2","firstName":"Lina","bookings":12,"rating":4.7}]}}"""

val mockStatisticsFixture = MockFixture(
    MerchantOperations.getStatistics.method.name,
    MerchantOperations.getStatistics.path,
    STATISTICS_JSON,
)
