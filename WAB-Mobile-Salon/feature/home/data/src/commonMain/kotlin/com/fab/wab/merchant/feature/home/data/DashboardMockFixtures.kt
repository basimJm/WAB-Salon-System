package com.fab.wab.merchant.feature.home.data

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.mock.MockFixture

/** Koin name of the mock dashboard (dev builds with `DATA_SOURCE=mock`). */
const val MOCK_DASHBOARD_FIXTURE = "mockDashboard"

private const val BRANCH = """{"id":"b-main","name":"__TEXT__"}"""

private fun row(id: String, ref: String, status: String, bride: Boolean, start: String, end: String, persons: String) =
    """{"id":"$id","referenceNumber":"$ref","status":"$status","paymentMethod":"DEPOSIT","paymentStatus":"PAID_DEPOSIT",""" +
        """"hasBride":$bride,"appointmentStart":"$start","appointmentEnd":"$end","respondBy":"2026-10-26T18:00:00Z",""" +
        """"requestedAt":"2026-10-25T08:30:00Z","personsCount":$persons,"total":"45.000","branch":$BRANCH,""" +
        """"customer":{"id":"c-$id","name":"__TEXT__","phone":"+962790000000"},""" +
        """"staff":[{"id":"s1","name":"__TEXT__","firstName":"__TEXT__","photoUrl":null}],""" +
        """"rejection":null}"""

/**
 * A live salon with two pending requests (one bride), three bookings today and this week's stats, so Home shows
 * every block in mock mode (the generated contract fixture has placeholder values).
 */
private val DASHBOARD_JSON =
    """{"success":true,"message":"","data":{""" +
        """"salon":{"id":"id-1","name":"__TEXT__","profileImageUrl":null,"state":"LIVE","missing":[]},""" +
        """"subscriptionWarning":{"endsAt":"2026-10-30T21:00:00Z","daysRemaining":5},"unreadNotifications":3,""" +
        """"pending":{"count":2,"items":[""" +
        row("b1", "WAB-24751", "PENDING", true, "2026-10-27T11:00:00Z", "2026-10-27T13:00:00Z", "3") + "," +
        row("b2", "WAB-24752", "PENDING", false, "2026-10-26T15:30:00Z", "2026-10-26T16:15:00Z", "1") + "]}," +
        """"today":{"approved":3,"completed":1,"next":""" +
        row("b3", "WAB-24740", "APPROVED", false, "2026-10-25T14:00:00Z", "2026-10-25T15:00:00Z", "1") +
        ""","timeline":[""" +
        row("b4", "WAB-24738", "COMPLETED", false, "2026-10-25T07:00:00Z", "2026-10-25T08:00:00Z", "1") + "," +
        row("b3", "WAB-24740", "APPROVED", false, "2026-10-25T14:00:00Z", "2026-10-25T15:00:00Z", "1") + "," +
        row("b5", "WAB-24744", "APPROVED", true, "2026-10-25T16:30:00Z", "2026-10-25T19:00:00Z", "2") + "]}," +
        """"quickStats":{"bookings":38,"revenue":"1240.500","rating":4.8}}}"""

val mockDashboardFixture = MockFixture(
    MerchantOperations.getDashboard.method.name,
    MerchantOperations.getDashboard.path,
    DASHBOARD_JSON,
)
