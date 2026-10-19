package com.fab.wab.customer.feature.salons.presentation.controller.contract

import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.PriceRange
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.ServiceRef
import kotlin.math.roundToInt

sealed interface FilterSheetContract {

    data class UiState(
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
        val canReset: Boolean get() = selectedServices.isNotEmpty() || general != null || minRating != null
        /** PRD S05 item 2: the price section exists only with a selected service and server bounds. */
        val showPrice: Boolean get() = selectedServices.isNotEmpty() && priceBounds != null

        fun toFilters(): SalonFilters = SalonFilters(
            services = selectedServices,
            priceRange = if (showPrice) priceSelection?.toPriceRange(priceBounds) else null,
            general = general,
            minRating = minRating,
        )
    }

    sealed interface UiAction {
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
