package com.fab.wab.customer.feature.home.presentation.controller.vm

import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.feature.home.domain.model.BookAgainEntry
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SalonSection
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiState

/** Pure state updates of S03 (BUSINESS_DOMAIN §5.22: one merged section per kind, filtered by the lens on the server). */
internal fun UiState.withContent(content: HomeContent, located: Boolean): UiState = copy(
    loading = false,
    refreshing = false,
    hasContent = true,
    banners = content.banners,
    explore = content.explore,
    nearYou = nearestOf(content.nearYou, located),
    recommended = content.recommended,
    bookAgain = if (signedIn) content.bookAgain?.items.orEmpty() else emptyList(),
    unreadCount = if (signedIn) content.unreadCount else 0,
)

/** The same business can appear in several sections: every copy follows the favorite. */
internal fun UiState.withFavorite(salonId: String, value: Boolean): UiState {
    val favorite: (SalonSummary) -> SalonSummary = { it.copy(isFavorite = value) }
    return copy(
        recommended = recommended.mapSalon(salonId, favorite),
        nearYou = nearYou.mapSalon(salonId, favorite),
        bookAgain = bookAgain.map { if (it.salon.id == salonId) it.copy(salon = favorite(it.salon)) else it },
    )
}

internal fun UiState.salon(id: String): SalonSummary? =
    sequenceOf(recommended.items, nearYou.items(), bookAgain.map(BookAgainEntry::salon))
        .flatten()
        .firstOrNull { it.id == id }

internal fun nearestOf(section: HomeSection<SalonSummary>?, located: Boolean): NearestUi = when {
    !located -> NearestUi.LocationOff
    section == null || section.items.isEmpty() -> NearestUi.Empty
    else -> NearestUi.Salons(section.items, section.hasMore)
}

internal fun SalonSection.filter(): SalonListFilter = when (this) {
    SalonSection.Recommended -> SalonListFilter.RECOMMENDED
    SalonSection.Nearest -> SalonListFilter.NEAREST
}

private fun NearestUi.items(): List<SalonSummary> = (this as? NearestUi.Salons)?.items.orEmpty()

private fun NearestUi.mapSalon(id: String, transform: (SalonSummary) -> SalonSummary): NearestUi =
    (this as? NearestUi.Salons)?.let { it.copy(items = it.items.replace(id, transform)) } ?: this

private fun HomeSection<SalonSummary>.mapSalon(id: String, transform: (SalonSummary) -> SalonSummary) =
    copy(items = items.replace(id, transform))

private fun List<SalonSummary>.replace(id: String, transform: (SalonSummary) -> SalonSummary) =
    map { if (it.id == id) transform(it) else it }
