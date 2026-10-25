@file:Suppress("DEPRECATION") // kotlinx-datetime 0.7 deprecations on the K/N classpath until the datetime upgrade

package com.fab.wab.merchant.feature.notifications.domain

import com.fab.wab.merchant.feature.notifications.domain.model.RelativeTime
import com.fab.wab.merchant.feature.notifications.domain.model.relativeTimeOf
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RelativeTimeTest {
    private val zone = "Asia/Amman"
    private val now = Instant.parse("2026-10-19T10:00:00Z") // 13:00 in Amman

    private fun at(iso: String) = relativeTimeOf(iso, now, zone)

    @Test
    fun bucketsFollowTheDesignScript() {
        assertEquals(RelativeTime.Now, at("2026-10-19T09:59:30Z"))
        assertEquals(RelativeTime.Minutes(2), at("2026-10-19T09:58:00Z"))
        assertEquals(RelativeTime.Hours(3), at("2026-10-19T07:00:00Z"))
        assertEquals(RelativeTime.Hours(14), at("2026-10-18T20:00:00Z"))
        assertEquals(RelativeTime.Yesterday, at("2026-10-18T05:00:00Z"))
        assertEquals(RelativeTime.Days(2), at("2026-10-17T05:00:00Z"))
        assertEquals(RelativeTime.Date("2026-10-10"), at("2026-10-10T05:00:00Z"))
    }

    @Test
    fun futureAndInvalidTimestamps() {
        assertEquals(RelativeTime.Now, at("2026-10-19T10:05:00Z"))
        assertNull(at("not-a-date"))
    }
}
