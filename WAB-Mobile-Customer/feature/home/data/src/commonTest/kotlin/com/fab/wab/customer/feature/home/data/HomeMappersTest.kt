package com.fab.wab.customer.feature.home.data

import com.fab.wab.customer.core.data.contract.generated.GetHomeData
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataBannersItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataClinicServices
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataClinicServicesItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestClinics
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestClinicsItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestSalonsItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataNearestSalonsItemsItemBranch
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommended
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedClinics
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedClinicsItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedSalons
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedSalonsItemsItem
import com.fab.wab.customer.core.data.contract.generated.GetHomeDataRecommendedSalonsItemsItemTodayHours
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
    fun homeMapsEverySectionPerBusinessTypeWithHoursAndUnreadCount() {
        val salon = GetHomeDataRecommendedSalonsItemsItem(
            id = "r1", name = "Glow", businessType = "SALON", audience = "BOTH", rating = 4.5, reviewsCount = 12.0,
            locationText = "Amman", isOpenNow = true, todayHours = GetHomeDataRecommendedSalonsItemsItemTodayHours("08:00", "16:00"),
            isFavorite = true, branchCount = 2.0,
        )
        val clinic = GetHomeDataRecommendedClinicsItemsItem(
            id = "c1", name = "Derma", businessType = "CLINIC", audience = "BOTH", rating = 4.0, reviewsCount = 1.0,
            isOpenNow = false, isFavorite = false, branchCount = 1.0,
        )
        val nearestClinic = GetHomeDataNearestClinicsItemsItem(
            id = "c2", name = "Laser", businessType = "CLINIC", audience = "BOTH", rating = 3.0, reviewsCount = 0.0,
            isOpenNow = true, isFavorite = false, distanceKm = 1.2, branchCount = 1.0, title = "Laser - Abdoun",
        )
        val data = home(
            salonServices = GetHomeDataSalonServices(emptyList(), hasMore = false),
            clinicServices = GetHomeDataClinicServices(
                listOf(GetHomeDataClinicServicesItemsItem("cs1", "Botox", "d", "", "CLINIC", "BOTH")),
                hasMore = true,
            ),
            recommendedSalons = GetHomeDataRecommendedSalons(listOf(salon), hasMore = true),
            recommendedClinics = GetHomeDataRecommendedClinics(listOf(clinic), hasMore = false),
            nearestClinics = GetHomeDataNearestClinics(listOf(nearestClinic), hasMore = false),
        ).toDomain()
        assertEquals(120, data.unreadCount)
        assertEquals(BannerAction.None, data.banners.single().action)
        val recommended = data.recommendedSalons.items.single()
        assertEquals(OpeningHours("08:00", "16:00"), recommended.todayHours)
        assertEquals(12, recommended.reviewsCount)
        assertEquals(2, recommended.branchCount)
        assertEquals(BusinessType.SALON to Audience.BOTH, recommended.businessType to recommended.audience)
        assertEquals(true, data.recommendedSalons.hasMore)
        assertEquals(BusinessType.CLINIC, data.recommendedClinics.items.single().businessType)
        assertEquals("Botox", data.clinicServices.items.single().name)
        assertNull(data.clinicServices.items.single().imageUrl, "a blank image is no image")
        assertEquals(true, data.clinicServices.hasMore)
        assertNull(data.nearestSalons, "no coordinates sent")
        assertEquals("Laser - Abdoun", data.nearestClinics?.items?.single()?.title)
        assertNull(recommended.title)
    }

    @Test
    fun nearestHasOneEntryPerBranchTitledSalonDashBranch() {
        fun entry(branchId: String, title: String, count: Double) = GetHomeDataNearestSalonsItemsItem(
            id = "s1", name = "Hifa Salon", businessType = "SALON", audience = "FEMALE", rating = 4.0, reviewsCount = 3.0,
            locationText = "Amman", isOpenNow = true, isFavorite = false, distanceKm = 0.8, branchCount = count,
            branch = GetHomeDataNearestSalonsItemsItemBranch(branchId, "B"), title = title,
        )
        val nearest = listOf(entry("b1", "Hifa Salon - Mecca Street", 2.0), entry("b2", "Hifa Salon - Abdoun", 2.0)).map { it.toDomain() }
        assertEquals(listOf("Hifa Salon - Mecca Street", "Hifa Salon - Abdoun"), nearest.map { it.title })
        assertEquals(listOf(BranchRef("b1", "B"), BranchRef("b2", "B")), nearest.map { it.branch })
        assertEquals(Audience.FEMALE, nearest.first().audience)
        assertNull(entry("b1", " ", 1.0).toDomain().title)
    }

    @Test
    fun unknownCodesReadAsALegacySalonWithoutAudience() {
        val item = GetHomeDataRecommendedSalonsItemsItem(
            id = "x", name = "x", businessType = "SPA", audience = "", rating = 0.0, reviewsCount = 0.0,
            isOpenNow = false, isFavorite = false, branchCount = 0.0,
        ).toDomain()
        assertEquals(BusinessType.SALON, item.businessType)
        assertNull(item.audience)
    }

    private fun home(
        salonServices: GetHomeDataSalonServices,
        clinicServices: GetHomeDataClinicServices,
        recommendedSalons: GetHomeDataRecommendedSalons,
        recommendedClinics: GetHomeDataRecommendedClinics,
        nearestClinics: GetHomeDataNearestClinics?,
    ) = GetHomeData(
        firstName = "x", unreadCount = 120.0,
        banners = listOf(GetHomeDataBannersItem("b1", "img", "NONE", null)),
        salonServices = salonServices,
        clinicServices = clinicServices,
        recommendedSalons = recommendedSalons,
        recommendedClinics = recommendedClinics,
        nearestSalons = null,
        nearestClinics = nearestClinics,
        services = GetHomeDataServices(emptyList(), hasMore = false),
        recommended = GetHomeDataRecommended(emptyList(), hasMore = false),
        nearest = null,
    )
}
