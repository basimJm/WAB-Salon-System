package com.fab.wab.customer.feature.home.data

import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.feature.home.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * CUS-060: `GET /home` captured from the dev API (guest, with coordinates) maps to every Home section; the merged keys of
 * CUS-102 were added to the capture by script from its per-type sections (re-capture on a 1.13.0 stack).
 */
class RealHomeFixtureTest {

    @Test
    fun realHomeMapsBannersServicesRecommendedAndNearestBranches() {
        val home = decodeFixture("GetHome", GetHomeData.serializer()).data.toDomain()
        assertEquals(0, home.unreadCount, "a guest has no unread count")
        assertTrue(home.banners.isNotEmpty() && home.banners.all { it.imageUrl.isNotBlank() })
        assertTrue(home.explore.items.isNotEmpty())
        assertTrue(home.recommended.items.isNotEmpty())
        assertEquals(null, home.bookAgain, "a guest has no Book again")
        val nearest = assertNotNull(home.nearYou, "coordinates were sent").items
        assertTrue(nearest.isNotEmpty())
        val complete = nearest.all { it.distanceKm != null && it.branch != null && it.displayName.isNotBlank() }
        assertTrue(complete, "one entry per branch: $nearest")
        assertEquals(nearest.size, nearest.map { it.entryKey }.toSet().size, "list keys are unique")
    }
}
