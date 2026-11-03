package com.fab.wab.customer.feature.salons.data.remote

import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonQuery

/** Query keys of `GET /salons`, `/salons/filters` and `/salons/suggestions` (contract 1.13.0). */
internal object SalonQueryKeys {
    const val PAGE = "page"
    const val PAGE_SIZE = "pageSize"
    const val GENDER = "gender"
    const val BUSINESS_TYPE = "businessType"
    const val TEXT = "q"
    const val SERVICE_IDS = "serviceIds"
    const val MIN_PRICE = "minPrice"
    const val MAX_PRICE = "maxPrice"
    const val MIN_RATING = "minRating"
    const val GENERAL = "general"
    const val LAT = "lat"
    const val LNG = "lng"
    const val SORT = "sort"
    const val GENERAL_RECOMMENDED = "RECOMMENDED"
    const val SORT_NEAREST = "NEAREST"
    /** Several business types travel as one comma list. */
    const val LIST_SEPARATOR = ","
}

/** Type (comma list, contract order) and gender: the scope every discovery endpoint shares. Nothing when not chosen. */
internal fun SalonFilters.scopeParams(): List<Pair<String, String>> = buildList {
    gender?.let { add(SalonQueryKeys.GENDER to it.code) }
    if (businessTypes.isNotEmpty()) {
        val codes = businessTypes.sortedBy { it.ordinal }.joinToString(SalonQueryKeys.LIST_SEPARATOR) { it.code }
        add(SalonQueryKeys.BUSINESS_TYPE to codes)
    }
}

/** `GET /salons/filters`: the scope + one `serviceIds` per service (price bounds without services are allowed). */
internal fun SalonFilters.priceBoundsParams(): List<Pair<String, String>> =
    scopeParams() + services.map { SalonQueryKeys.SERVICE_IDS to it.id }

/** Every filter of one `GET /salons` page; `openNow` stays on the device (no contract filter). */
internal fun SalonQuery.toParams(): List<Pair<String, String>> = buildList {
    add(SalonQueryKeys.PAGE to page.toString())
    add(SalonQueryKeys.PAGE_SIZE to pageSize.toString())
    addAll(filters.priceBoundsParams())
    text.trim().takeIf { it.isNotEmpty() }?.let { add(SalonQueryKeys.TEXT to it) }
    filters.priceRange?.let {
        add(SalonQueryKeys.MIN_PRICE to it.min)
        add(SalonQueryKeys.MAX_PRICE to it.max)
    }
    filters.minRating?.let { add(SalonQueryKeys.MIN_RATING to it.toString()) }
    when (filters.general) {
        GeneralFilter.RECOMMENDED -> add(SalonQueryKeys.GENERAL to SalonQueryKeys.GENERAL_RECOMMENDED)
        GeneralFilter.NEAREST -> add(SalonQueryKeys.SORT to SalonQueryKeys.SORT_NEAREST)
        null -> Unit
    }
    location?.let {
        add(SalonQueryKeys.LAT to it.latitude.toString())
        add(SalonQueryKeys.LNG to it.longitude.toString())
    }
}
