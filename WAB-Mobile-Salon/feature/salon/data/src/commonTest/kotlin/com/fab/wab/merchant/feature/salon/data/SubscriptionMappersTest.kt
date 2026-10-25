package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.GetSubscriptionData
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.feature.salon.domain.SubscriptionStatus
import kotlin.test.Test
import kotlin.test.assertEquals

class SubscriptionMappersTest {

    @Test
    fun theEndDateFollowsTheStatus() {
        val trial = GetSubscriptionData("TRIAL", "LIVE", "2026-10-29", null, null, 5.0, true, null).toDomain()
        assertEquals(SubscriptionStatus.TRIAL, trial.status)
        assertEquals("2026-10-29", trial.endsAt)
        assertEquals(SalonState.LIVE, trial.salonState)
        assertEquals(
            "2026-11-30",
            GetSubscriptionData("ACTIVE", "LIVE", "2026-01-01", "2026-11-30", null, 30.0, false, null).toDomain().endsAt,
        )
        assertEquals(
            SubscriptionStatus.EXPIRED,
            GetSubscriptionData("WHAT", "OFFLINE", null, null, "2026-09-30", 0.0, false, null).toDomain().status,
        )
    }
}
