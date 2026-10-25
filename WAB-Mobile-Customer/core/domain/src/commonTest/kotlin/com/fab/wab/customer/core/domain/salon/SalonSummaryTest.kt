package com.fab.wab.customer.core.domain.salon

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Nearest entries are branches, every other card is a salon (BUSINESS_DOMAIN §5.17). */
class SalonSummaryTest {

    private fun card(title: String? = null, branchCount: Int = 3, branch: BranchRef? = BranchRef("b2", "Mecca Street")) = SalonSummary(
        id = "s1", name = "Hifa Salon", imageUrl = null, rating = 4f, reviewsCount = 1, locationText = "Amman", shortDescription = null,
        isOpenNow = true, todayHours = null, isFavorite = false, distanceKm = 1.0, branchCount = branchCount, branch = branch,
        title = title,
    )

    @Test
    fun nearestEntryIsTitledByTheServerAndKeyedByBranch() {
        val entry = card(title = "Hifa Salon - Mecca Street")
        assertTrue(entry.isBranchEntry)
        assertEquals("Hifa Salon - Mecca Street", entry.displayName)
        assertEquals(1, entry.shownBranchCount)
        assertEquals("s1/b2", entry.entryKey)
        assertEquals("b2", entry.preselectedBranchId)
    }

    @Test
    fun salonCardKeepsTheSalonNameCountAndKey() {
        val salon = card()
        assertFalse(salon.isBranchEntry)
        assertEquals("Hifa Salon", salon.displayName)
        assertEquals(3, salon.shownBranchCount)
        assertEquals("s1", salon.entryKey)
        assertNull(salon.preselectedBranchId)
    }

    @Test
    fun blankTitleOrMissingBranchFallsBackToTheSalon() {
        assertEquals("Hifa Salon", card(title = " ").displayName)
        assertEquals("s1", card(title = "Hifa Salon", branch = null).entryKey)
        assertNull(card(title = "Hifa Salon", branch = null).preselectedBranchId)
    }
}
