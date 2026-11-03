package com.fab.wab.customer.feature.salons.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.domain.session.Gender
import kotlin.math.roundToInt

sealed interface FilterSheetContract {

    data class UiState(
        /** Chosen first (owner 2026-10-30, multi since §5.22): the services below are the catalog of one chosen type; none = all. */
        val businessTypes: Set<BusinessType> = emptySet(),
        /** Men = audience MALE or BOTH, Women = FEMALE or BOTH (§5.22); null = everyone. */
        val gender: Gender? = null,
        /** Kept from S04 (a quick chip): the sheet does not show it. */
        val openNow: Boolean = false,
        val services: List<ServiceRef> = emptyList(),
        val servicesPage: Int = 0,
        val servicesHasMore: Boolean = false,
        val servicesLoading: Boolean = true,
        val servicesError: String? = null,
        val selectedServices: List<ServiceRef> = emptyList(),
        val priceBounds: PriceRange? = null,
        val priceSelection: ClosedFloatingPointRange<Float>? = null,
        val priceLoading: Boolean = false,
        val general: GeneralFilter? = null,
        val minRating: Int? = null,
    ) {
        val canReset: Boolean
            get() = selectedServices.isNotEmpty() || general != null || minRating != null || businessTypes.isNotEmpty() ||
                gender != null || priceSelection?.toPriceRange(priceBounds) != null
        /** §5.22: price works without services; the section shows whenever the server has bounds for the scope. */
        val showPrice: Boolean get() = priceBounds != null

        fun toFilters(): SalonFilters = SalonFilters(
            services = selectedServices,
            priceRange = if (showPrice) priceSelection?.toPriceRange(priceBounds) else null,
            general = general,
            minRating = minRating,
            businessTypes = businessTypes,
            gender = gender,
            openNow = openNow,
        )
    }

    sealed interface UiAction {
        /** Null = All (clears the types); a type toggles in or out. */
        data class OnBusinessTypeToggle(val businessType: BusinessType?) : UiAction
        /** The chosen gender again clears it. */
        data class OnGenderSelect(val gender: Gender) : UiAction
        data class OnServiceToggle(val service: ServiceRef) : UiAction
        data object OnSeeMoreServices : UiAction
        data object OnRetryServices : UiAction
        data class OnPriceChange(val range: ClosedFloatingPointRange<Float>) : UiAction
        data class OnGeneralSelect(val general: GeneralFilter) : UiAction
        data class OnRatingSelect(val rating: Int) : UiAction
        data object OnReset : UiAction
        data object OnApply : UiAction
    }

    sealed interface SideEffect {
        data class Applied(val filters: SalonFilters) : SideEffect
    }
}

object RatingOptions {
    const val MIN = 1
    const val MAX = 5
    val all: List<Int> = (MIN..MAX).toList()
}

/** Server bounds are JOD text; the slider works in floats. Null when the bounds are not numeric (fixtures). */
fun PriceRange.toFloatRange(): ClosedFloatingPointRange<Float>? {
    val low = min.toFloatOrNull() ?: return null
    val high = max.toFloatOrNull() ?: return null
    return if (low <= high) low..high else null
}

/** The chosen range back to the server's text form; an untouched full-bounds selection is no price filter. */
fun ClosedFloatingPointRange<Float>.toPriceRange(bounds: PriceRange?): PriceRange? {
    val full = bounds?.toFloatRange()
    if (full != null && start <= full.start && endInclusive >= full.endInclusive) return null
    return PriceRange(start.roundToInt().toString(), endInclusive.roundToInt().toString())
}

/** Multi-select of the type section: All clears, a type toggles (BUSINESS_DOMAIN §5.22). */
fun Set<BusinessType>.toggled(type: BusinessType?): Set<BusinessType> = when {
    type == null -> emptySet()
    type in this -> this - type
    else -> this + type
}
