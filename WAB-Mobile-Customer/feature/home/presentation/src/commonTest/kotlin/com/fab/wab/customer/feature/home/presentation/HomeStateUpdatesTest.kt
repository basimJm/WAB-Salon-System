package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.feature.home.domain.model.BookAgainEntry
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.HomeBlock
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiState
import com.fab.wab.customer.feature.home.presentation.controller.vm.salon
import com.fab.wab.customer.feature.home.presentation.controller.vm.withContent
import com.fab.wab.customer.feature.home.presentation.controller.vm.withFavorite
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** CUS-102 (BUSINESS_DOMAIN §5.22): one merged section per kind, in the Home order. */
class HomeStateUpdatesTest {

    private fun business(id: String, type: BusinessType) = SalonSummary(
        id = id, name = id, imageUrl = null, rating = 4f, reviewsCount = 1, locationText = null, shortDescription = null,
        isOpenNow = true, todayHours = null, isFavorite = false, distanceKm = 1.0, businessType = type,
        audience = if (type == BusinessType.SALON) Audience.FEMALE else Audience.BOTH,
    )

    private val content = HomeContent(
        unreadCount = 4,
        banners = emptyList(),
        explore = HomeSection(listOf(HomeService("cv", "Laser", "", null, BusinessType.CLINIC)), hasMore = true),
        nearYou = HomeSection(listOf(business("s2", BusinessType.SALON), business("t1", BusinessType.TATTOO)), hasMore = false),
        recommended = HomeSection(listOf(business("c1", BusinessType.CLINIC)), hasMore = true),
        bookAgain = HomeSection(listOf(BookAgainEntry(business("s3", BusinessType.SALON), "bk", listOf("x"))), hasMore = false),
    )

    @Test
    fun contentFillsTheMergedSectionsInOrder() {
        val state = UiState(signedIn = true).withContent(content, located = true)
        assertEquals("Laser", state.explore.items.single().name)
        assertEquals("c1", state.recommended.items.single().id)
        assertEquals(listOf("s2", "t1"), (state.nearYou as NearestUi.Salons).items.map { it.id })
        assertEquals("s3", state.bookAgain.single().salon.id)
        assertEquals(4, state.unreadCount)
        assertTrue(state.hasContent)
        assertEquals(listOf(HomeBlock.Explore, HomeBlock.NearYou, HomeBlock.Recommended, HomeBlock.BookAgain), state.blocks)
    }

    @Test
    fun withoutLocationNearYouAsksForItAndGuestsHaveNoBadgeOrBookAgain() {
        val state = UiState(signedIn = false).withContent(content, located = false)
        assertEquals(NearestUi.LocationOff, state.nearYou)
        assertEquals(0, state.unreadCount)
        assertEquals(emptyList(), state.bookAgain)
        assertEquals(listOf(HomeBlock.Explore, HomeBlock.NearYou, HomeBlock.Recommended), state.blocks)
    }

    @Test
    fun emptyNearYouShowsTheEmptyText() {
        val state = UiState().withContent(content.copy(nearYou = HomeSection.empty()), located = true)
        assertEquals(NearestUi.Empty, state.nearYou)
    }

    @Test
    fun favoritesFollowTheBusinessInEverySection() {
        val state = UiState(signedIn = true).withContent(content, located = true)
        val updated = state.withFavorite("c1", value = true).withFavorite("s2", value = true).withFavorite("s3", value = true)
        assertEquals(true, updated.recommended.items.single().isFavorite)
        val near = assertIs<NearestUi.Salons>(updated.nearYou)
        assertEquals(listOf(true, false), near.items.map { it.isFavorite })
        assertEquals(true, updated.bookAgain.single().salon.isFavorite)
        assertEquals("s3", updated.salon("s3")?.id)
        assertNull(updated.salon("missing"))
    }
}
