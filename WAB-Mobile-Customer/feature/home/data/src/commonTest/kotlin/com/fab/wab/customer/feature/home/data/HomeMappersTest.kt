package com.fab.wab.customer.feature.home.data

import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBannersItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBookAgain
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBookAgainItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBookAgainItemsItemLastBooking
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataClinicServices
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataExplore
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataExploreItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearYou
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearYouItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearYouItemsItemBranch
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommended
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedAll
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedAllItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedAllItemsItemTodayHours
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedClinics
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedSalons
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataSalonServices
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataServices
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BranchRef
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.OpeningHours
import com.fab.wab.customer.feature.home.data.repository.toDomain
import com.fab.wab.customer.feature.home.domain.model.BannerAction
import com.fab.wab.customer.feature.home.domain.model.bannerActionOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/** CUS-102: the merged Home keys of contract 1.13.0 (BUSINESS_DOMAIN §5.22). */
class HomeMappersTest {

    @Test
    fun bannerActionsFollowTheContractCodes() {
        assertEquals(BannerAction.Salon("s1"), bannerActionOf("SALON", "s1"))
        assertEquals(BannerAction.ExternalUrl("u"), bannerActionOf("external_url", "u"))
        assertEquals(BannerAction.None, bannerActionOf("SALON", " "))
        assertEquals(BannerAction.None, bannerActionOf("actionType", "x"))
    }

    @Test
    fun exploreKeepsTheTypeOfEveryServiceIncludingTattoo() {
        val data = home(
            explore = GetHomeDataExplore(
                listOf(
                    GetHomeDataExploreItemsItem("s1", "Haircut", "d", "img", "SALON", "FEMALE"),
                    GetHomeDataExploreItemsItem("c1", "Botox", "d", "", "CLINIC", "BOTH"),
                    GetHomeDataExploreItemsItem("t1", "Fine line", "d", "img", "TATTOO", "BOTH"),
                ),
                hasMore = true,
            ),
        ).toDomain()
        assertEquals(listOf(BusinessType.SALON, BusinessType.CLINIC, BusinessType.TATTOO), data.explore.items.map { it.businessType })
        assertNull(data.explore.items[1].imageUrl, "a blank image is no image")
        assertEquals(true, data.explore.hasMore)
        assertEquals(120, data.unreadCount)
        assertEquals(BannerAction.None, data.banners.single().action)
    }

    @Test
    fun recommendedIsOneRailWithHoursAndTypes() {
        val item = GetHomeDataRecommendedAllItemsItem(
            id = "r1", name = "Ink", businessType = "TATTOO", audience = "BOTH", rating = 4.5, reviewsCount = 12.0,
            locationText = "Amman", isOpenNow = true, todayHours = GetHomeDataRecommendedAllItemsItemTodayHours("08:00", "16:00"),
            isFavorite = true, branchCount = 2.0,
        )
        val recommended = home(recommended = GetHomeDataRecommendedAll(listOf(item), hasMore = true)).toDomain().recommended
        val card = recommended.items.single()
        assertEquals(BusinessType.TATTOO to Audience.BOTH, card.businessType to card.audience)
        assertEquals(OpeningHours("08:00", "16:00"), card.todayHours)
        assertEquals(2, card.branchCount)
        assertNull(card.title)
        assertEquals(true, recommended.hasMore)
    }

    @Test
    fun nearYouIsNullWithoutCoordinatesAndOneEntryPerBranchWithThem() {
        assertNull(home().toDomain().nearYou, "no coordinates sent")
        fun entry(branchId: String, title: String, type: String) = GetHomeDataNearYouItemsItem(
            id = "s1", name = "Hifa", businessType = type, audience = "BOTH", rating = 4.0, reviewsCount = 3.0,
            isOpenNow = true, isFavorite = false, distanceKm = 0.8, branchCount = 2.0,
            branch = GetHomeDataNearYouItemsItemBranch(branchId, "B"), title = title,
        )
        val near = home(
            nearYou = GetHomeDataNearYou(listOf(entry("b1", "Hifa - Abdoun", "SALON"), entry("b2", " ", "CLINIC")), hasMore = false),
        ).toDomain().nearYou
        val items = assertNotNull(near).items
        assertEquals(listOf("Hifa - Abdoun", null), items.map { it.title })
        assertEquals(BranchRef("b1", "B"), items.first().branch)
        assertEquals(listOf(BusinessType.SALON, BusinessType.CLINIC), items.map { it.businessType })
    }

    @Test
    fun bookAgainCarriesTheLastBookingAndIsNullForGuests() {
        assertNull(home().toDomain().bookAgain, "guests get no Book again")
        val item = GetHomeDataBookAgainItemsItem(
            id = "s9", name = "Glow", businessType = "SALON", audience = "FEMALE", rating = 4.0, reviewsCount = 1.0,
            isOpenNow = false, isFavorite = false, branchCount = 1.0,
            lastBooking = GetHomeDataBookAgainItemsItemLastBooking("bk1", listOf("ss1", "ss2")),
        )
        val entry = assertNotNull(home(bookAgain = GetHomeDataBookAgain(listOf(item), hasMore = false)).toDomain().bookAgain).items.single()
        assertEquals("s9", entry.salon.id)
        assertEquals("bk1", entry.lastBookingId)
        assertEquals(listOf("ss1", "ss2"), entry.salonServiceIds)
    }

    @Test
    fun unknownCodesReadAsALegacySalonWithoutAudience() {
        val item = GetHomeDataRecommendedAllItemsItem(
            id = "x", name = "x", businessType = "SPA", audience = "", rating = 0.0, reviewsCount = 0.0,
            isOpenNow = false, isFavorite = false, branchCount = 0.0,
        ).toDomain()
        assertEquals(BusinessType.SALON, item.businessType)
        assertNull(item.audience)
    }

    private fun home(
        explore: GetHomeDataExplore = GetHomeDataExplore(emptyList(), hasMore = false),
        nearYou: GetHomeDataNearYou? = null,
        recommended: GetHomeDataRecommendedAll = GetHomeDataRecommendedAll(emptyList(), hasMore = false),
        bookAgain: GetHomeDataBookAgain? = null,
    ) = GetHomeData(
        firstName = "x", unreadCount = 120.0,
        banners = listOf(GetHomeDataBannersItem("b1", "img", "NONE", null)),
        explore = explore,
        nearYou = nearYou,
        recommendedAll = recommended,
        bookAgain = bookAgain,
        salonServices = GetHomeDataSalonServices(emptyList(), hasMore = false),
        clinicServices = GetHomeDataClinicServices(emptyList(), hasMore = false),
        recommendedSalons = GetHomeDataRecommendedSalons(emptyList(), hasMore = false),
        recommendedClinics = GetHomeDataRecommendedClinics(emptyList(), hasMore = false),
        services = GetHomeDataServices(emptyList(), hasMore = false),
        recommended = GetHomeDataRecommended(emptyList(), hasMore = false),
    )
}
