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

/**
 * All active filters of S04 / S05; combined with the search text in one query (PRD S04 "AND"). BUSINESS_DOMAIN §5.22:
 * nothing filters by the customer's gender unless [gender] is chosen here (Men = audience MALE or BOTH, Women = FEMALE or
 * BOTH); [businessTypes] empty = every type; [openNow] matches when any bookable branch is open now in Asia/Amman
 * (BUSINESS_DOMAIN §5.17, §5.3) and is sent to the server, never filtered on the device.
 */
data class SalonFilters(
    val services: List<ServiceRef> = emptyList(),
    val priceRange: PriceRange? = null,
    val general: GeneralFilter? = null,
    val minRating: Int? = null,
    val businessTypes: Set<BusinessType> = emptySet(),
    val gender: Gender? = null,
    val openNow: Boolean = false,
) {
    /** The one chosen type (lens, list title, catalog of the sheet); null for none or several. */
    val singleBusinessType: BusinessType? get() = businessTypes.singleOrNull()

    val isEmpty: Boolean
        get() = services.isEmpty() && priceRange == null && general == null && minRating == null && businessTypes.isEmpty() &&
            gender == null && !openNow

    /** The lens chips All · Salons · Clinics · Tattoo set exactly one type, or none. */
    fun withLens(type: BusinessType?): SalonFilters = copy(businessTypes = setOfNotNull(type))
}

/** One `GET /salons` page; `location` only when the user allowed it (needed by [GeneralFilter.NEAREST]). */
data class SalonQuery(
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
