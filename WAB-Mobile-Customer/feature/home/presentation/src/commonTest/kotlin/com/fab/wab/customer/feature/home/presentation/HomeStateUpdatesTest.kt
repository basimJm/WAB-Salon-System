package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiState
import com.fab.wab.customer.feature.home.presentation.controller.vm.salon
import com.fab.wab.customer.feature.home.presentation.controller.vm.servicesOf
import com.fab.wab.customer.feature.home.presentation.controller.vm.withContent
import com.fab.wab.customer.feature.home.presentation.controller.vm.withFavorite
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** CUS-098 (BUSINESS_DOMAIN §5.19): Home keeps one section per business type in the Home order. */
class HomeStateUpdatesTest {

    private fun business(id: String, type: BusinessType) = SalonSummary(
        id = id, name = id, imageUrl = null, rating = 4f, reviewsCount = 1, locationText = null, shortDescription = null,
        isOpenNow = true, todayHours = null, isFavorite = false, distanceKm = 1.0, businessType = type,
        audience = if (type == BusinessType.CLINIC) Audience.BOTH else Audience.FEMALE,
    )

    private val content = HomeContent(
        unreadCount = 4,
        banners = emptyList(),
        salonServices = HomeSection(listOf(HomeService("sv", "Hair", "", null)), hasMore = false),
        clinicServices = HomeSection(listOf(HomeService("cv", "Laser", "", null)), hasMore = true),
        recommendedSalons = HomeSection(listOf(business("s1", BusinessType.SALON)), hasMore = false),
        recommendedClinics = HomeSection(listOf(business("c1", BusinessType.CLINIC)), hasMore = true),
        nearestSalons = HomeSection(listOf(business("s2", BusinessType.SALON)), hasMore = false),
        nearestClinics = HomeSection(emptyList(), hasMore = false),
    )

    @Test
    fun contentFillsEverySalonAndClinicSection() {
        val state = UiState(signedIn = true).withContent(content, located = true)
        assertEquals("Hair", state.servicesOf(BusinessType.SALON).items.single().name)
        assertEquals("Laser", state.servicesOf(BusinessType.CLINIC).items.single().name)
        assertEquals("c1", state.recommendedClinics.items.single().id)
        assertIs<NearestUi.Salons>(state.nearestSalons)
        assertEquals(NearestUi.Empty, state.nearestClinics)
        assertEquals(4, state.unreadCount)
        assertTrue(state.hasContent)
    }

    @Test
    fun withoutLocationBothNearestSectionsAreOffAndGuestsHaveNoBadge() {
        val state = UiState(signedIn = false).withContent(content, located = false)
        assertEquals(NearestUi.LocationOff, state.nearestSalons)
        assertEquals(NearestUi.LocationOff, state.nearestClinics)
        assertEquals(0, state.unreadCount)
    }

    @Test
    fun favoritesFollowTheBusinessInEverySection() {
        val state = UiState().withContent(content, located = true)
        val updated = state.withFavorite("c1", value = true).withFavorite("s2", value = true)
        assertEquals(true, updated.recommendedClinics.items.single().isFavorite)
        assertEquals(true, (updated.nearestSalons as NearestUi.Salons).items.single().isFavorite)
        assertEquals(false, updated.recommendedSalons.items.single().isFavorite)
        assertEquals("c1", updated.salon("c1")?.id)
        assertEquals("s2", updated.salon("s2")?.id)
        assertNull(updated.salon("missing"))
    }
}
