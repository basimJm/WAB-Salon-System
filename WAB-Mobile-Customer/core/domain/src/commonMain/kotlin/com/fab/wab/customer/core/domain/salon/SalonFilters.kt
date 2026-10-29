package com.fab.wab.customer.core.domain.salon

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.session.Gender

/** A service chosen as a filter; the name is kept so the chip can show it without another request (PRD S04 item 3). */
data class ServiceRef(val id: String, val name: String)

/** Price bounds of S05 as the server sends them (JOD text, tax-inclusive). */
data class PriceRange(val min: String, val max: String)

/** General single-select filter of S05 (PRD S04 presets). */
enum class GeneralFilter { RECOMMENDED, NEAREST }

/** All active filters of S04 / S05; combined with the search text in one query (PRD S04 "AND"). */
data class SalonFilters(
    val services: List<ServiceRef> = emptyList(),
    val priceRange: PriceRange? = null,
    val general: GeneralFilter? = null,
    val minRating: Int? = null,
) {
    val isEmpty: Boolean get() = services.isEmpty() && priceRange == null && general == null && minRating == null
}

/** One `GET /salons` page; `location` only when the user allowed it (needed by [GeneralFilter.NEAREST]); `businessType` null = all. */
data class SalonQuery(
    val gender: Gender,
    val businessType: BusinessType? = null,
    val text: String = "",
    val filters: SalonFilters = SalonFilters(),
    val location: LocationData? = null,
    val page: Int = SalonQueryDefaults.FIRST_PAGE,
    val pageSize: Int = SalonQueryDefaults.PAGE_SIZE,
)

object SalonQueryDefaults {
    const val FIRST_PAGE = 1
    const val PAGE_SIZE = 10
    /** `q` max length of the contract. */
    const val MAX_TEXT_LENGTH = 80
    /** PRD S04: search by name with a 500 ms debounce; never a request per keystroke. */
    const val SEARCH_DEBOUNCE_MS = 500L
}

interface SalonSearchRepository {
    suspend fun search(query: SalonQuery): AppResult<List<SalonSummary>>
}
