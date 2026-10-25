package com.fab.wab.customer.feature.home.data

import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBannersItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestItemsItemBranch
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommended
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedItemsItemTodayHours
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataServices
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.feature.home.data.repository.toDomain
import com.fab.wab.customer.feature.home.domain.model.BannerAction
import com.fab.wab.customer.feature.home.domain.model.bannerActionOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class HomeMappersTest {

    @Test
    fun bannerActionsFollowTheContractCodes() {
        assertEquals(BannerAction.Salon("s1"), bannerActionOf("SALON", "s1"))
        assertEquals(BannerAction.ExternalUrl("u"), bannerActionOf("external_url", "u"))
        assertEquals(BannerAction.None, bannerActionOf("SALON", " "))
        assertEquals(BannerAction.None, bannerActionOf("actionType", "x"))
    }

    @Test
    fun homeMapsSectionsHoursAndUnreadCount() {
        val salon = GetHomeDataRecommendedItemsItem(
            id = "r1", name = "Glow", profileImageUrl = null, rating = 4.5, reviewsCount = 12.0,
            locationText = "Amman", shortDescription = null, isOpenNow = true,
            todayHours = GetHomeDataRecommendedItemsItemTodayHours("08:00", "16:00"), isFavorite = true, distanceKm = null,
            branchCount = 2.0,
        )
        val data = GetHomeData(
            firstName = "x", unreadCount = 120.0,
            banners = listOf(GetHomeDataBannersItem("b1", "img", "NONE", null)),
            services = GetHomeDataServices(emptyList(), hasMore = false),
            recommended = GetHomeDataRecommended(listOf(salon), hasMore = true),
            nearest = null,
        ).toDomain()
        assertEquals(120, data.unreadCount)
        assertEquals(BannerAction.None, data.banners.single().action)
        assertEquals(OpeningHours("08:00", "16:00"), data.recommended.items.single().todayHours)
        assertEquals(12, data.recommended.items.single().reviewsCount)
        assertEquals(true, data.recommended.hasMore)
        assertNull(data.nearest)
        assertEquals(2, data.recommended.items.single().branchCount)
        assertNull(data.recommended.items.single().title)
    }

    @Test
    fun nearestHasOneEntryPerBranchTitledSalonDashBranch() {
        fun entry(branchId: String, title: String, count: Double) = GetHomeDataNearestItemsItem(
            id = "s1", name = "Hifa Salon", rating = 4.0, reviewsCount = 3.0, locationText = "Amman", isOpenNow = true,
            isFavorite = false, distanceKm = 0.8, branchCount = count, branch = GetHomeDataNearestItemsItemBranch(branchId, "B"),
            title = title,
        )
        val nearest = listOf(entry("b1", "Hifa Salon - Mecca Street", 2.0), entry("b2", "Hifa Salon - Abdoun", 2.0)).map { it.toDomain() }
        assertEquals(listOf("Hifa Salon - Mecca Street", "Hifa Salon - Abdoun"), nearest.map { it.title })
        assertEquals(listOf(BranchRef("b1", "B"), BranchRef("b2", "B")), nearest.map { it.branch })
        assertNull(entry("b1", " ", 1.0).toDomain().title)
    }
}
