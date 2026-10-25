package com.fab.wab.customer.feature.salons.data

import com.fab.wab.customer.core.data.contract.generated.GetSalonsDataItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsDataItemBranch
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.feature.salons.data.repository.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** One card per salon (BUSINESS_DOMAIN §5.17): place and distance of the nearest branch, branch count for the label. */
class SalonCardMapperTest {

    private fun item(branchCount: Double, branch: GetSalonsDataItemBranch?) = GetSalonsDataItem(
        id = "s1", name = "Hifa Salon", rating = 4.5, reviewsCount = 12.0, locationText = "Mecca Street", isOpenNow = true,
        isFavorite = false, distanceKm = 1.2, branchCount = branchCount, branch = branch,
    )

    @Test
    fun cardCarriesTheNearestBranchAndTheBranchCount() {
        val card = item(3.0, GetSalonsDataItemBranch("b2", "Mecca Street")).toDomain()
        assertEquals(3, card.branchCount)
        assertEquals(BranchRef("b2", "Mecca Street"), card.branch)
        assertEquals("Mecca Street", card.locationText)
        assertEquals(1.2, card.distanceKm)
        assertNull(card.title)
    }

    @Test
    fun branchCountNeverDropsBelowOne() {
        val card = item(0.0, null).toDomain()
        assertEquals(1, card.branchCount)
        assertNull(card.branch)
    }
}
