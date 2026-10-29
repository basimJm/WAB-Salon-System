package com.fab.wab.customer.feature.home.presentation.controller.vm

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SalonSection
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiState

/** Pure state updates of S03 (BUSINESS_DOMAIN §5.19: every section exists once for salons and once for clinics). */
internal fun UiState.withContent(content: HomeContent, located: Boolean): UiState = copy(
    loading = false,
    refreshing = false,
    hasContent = true,
    banners = content.banners,
    salonServices = content.salonServices,
    clinicServices = content.clinicServices,
    recommendedSalons = content.recommendedSalons,
    recommendedClinics = content.recommendedClinics,
    nearestSalons = nearestOf(content.nearestSalons, located),
    nearestClinics = nearestOf(content.nearestClinics, located),
    unreadCount = if (signedIn) content.unreadCount else 0,
)

internal fun UiState.servicesOf(type: BusinessType): HomeSection<HomeService> = when (type) {
    BusinessType.SALON -> salonServices
    BusinessType.CLINIC -> clinicServices
}

/** The same business can appear in a recommended and a nearest section: every copy follows the favorite. */
internal fun UiState.withFavorite(salonId: String, value: Boolean): UiState {
    val favorite: (SalonSummary) -> SalonSummary = { it.copy(isFavorite = value) }
    return copy(
        recommendedSalons = recommendedSalons.mapSalon(salonId, favorite),
        recommendedClinics = recommendedClinics.mapSalon(salonId, favorite),
        nearestSalons = nearestSalons.mapSalon(salonId, favorite),
        nearestClinics = nearestClinics.mapSalon(salonId, favorite),
    )
}

internal fun UiState.salon(id: String): SalonSummary? =
    sequenceOf(recommendedSalons.items, recommendedClinics.items, nearestSalons.items(), nearestClinics.items())
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
