package com.fab.wab.customer.feature.home.data

import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.feature.home.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** CUS-060: `GET /home` captured from the dev API (guest, with coordinates) maps to every Home section. */
class RealHomeFixtureTest {

    @Test
    fun realHomeMapsBannersServicesRecommendedAndNearestBranches() {
        val home = decodeFixture("GetHome", GetHomeData.serializer()).data.toDomain()
        assertEquals(0, home.unreadCount, "a guest has no unread count")
        assertTrue(home.banners.isNotEmpty() && home.banners.all { it.imageUrl.isNotBlank() })
        assertTrue(home.salonServices.items.isNotEmpty())
        assertTrue(home.recommendedSalons.items.isNotEmpty())
        val nearest = assertNotNull(home.nearestSalons, "coordinates were sent").items
        assertTrue(nearest.isNotEmpty())
        val complete = nearest.all { it.distanceKm != null && it.branch != null && it.displayName.isNotBlank() }
        assertTrue(complete, "one entry per branch: $nearest")
        assertEquals(nearest.size, nearest.map { it.entryKey }.toSet().size, "list keys are unique")
    }
}
