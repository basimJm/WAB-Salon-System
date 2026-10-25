package com.fab.wab.merchant.feature.home.presentation

import com.fab.wab.merchant.feature.home.domain.DashboardBooking
import com.fab.wab.merchant.feature.home.presentation.screen.ageAt
import com.fab.wab.merchant.feature.home.presentation.screen.autoCancelAt
import com.fab.wab.merchant.feature.home.presentation.screen.epochMsOf
import com.fab.wab.merchant.feature.home.presentation.screen.staffLine
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

class HomeUiMappersTest {

    private fun booking(requestedAt: String, respondBy: String) = DashboardBooking(
        "b", "WAB-1", null, false, "2026-10-25T10:00:00Z", "2026-10-25T11:00:00Z", respondBy, requestedAt, 1, "Huda",
        listOf("Sara", " ", "Lina"), null,
    )

    @Test
    fun agesAndCountdownsComeFromTheServerInstants() {
        val now = epochMsOf("2026-10-25T09:00:00Z") ?: error("parse")
        val row = booking("2026-10-25T08:30:00Z", "2026-10-25T11:00:00Z")
        assertEquals(30.minutes, row.ageAt(now))
        assertEquals(120.minutes, row.autoCancelAt(now))
        assertEquals("Sara, Lina", row.staffLine(", "))
    }

    @Test
    fun unknownInstantsDegradeQuietly() {
        val row = booking("yesterday", "soon")
        assertNull(epochMsOf("yesterday"))
        assertEquals(Duration.ZERO, row.ageAt(0L))
        assertNull(row.autoCancelAt(0L))
    }
}
