package com.fab.wab.customer.feature.salons.domain.model

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType

/** A catalog service matching the typed text and how many places offer it (BUSINESS_DOMAIN §5.22). */
data class SuggestedService(val id: String, val name: String, val businessType: BusinessType, val placesCount: Int)

/** A business whose name matches the typed text. */
data class SuggestedPlace(val id: String, val name: String, val businessType: BusinessType, val audience: Audience?)

/** `GET /salons/suggestions`: Services first, then Places. */
data class SearchSuggestions(val services: List<SuggestedService>, val places: List<SuggestedPlace>) {
    val isEmpty: Boolean get() = services.isEmpty() && places.isEmpty()

    companion object {
        val NONE = SearchSuggestions(emptyList(), emptyList())
    }
}

/** One row of the suggestions list in display order: a group header, then its rows (Services, then Places). */
sealed interface SuggestionRow {
    enum class Group { SERVICES, PLACES }

    data class Header(val group: Group) : SuggestionRow
    data class Service(val service: SuggestedService) : SuggestionRow
    data class Place(val place: SuggestedPlace) : SuggestionRow
}

/** Services group (with its header) before the Places group; an empty group has no header. */
fun SearchSuggestions.rows(): List<SuggestionRow> = buildList {
    if (services.isNotEmpty()) {
        add(SuggestionRow.Header(SuggestionRow.Group.SERVICES))
        services.forEach { add(SuggestionRow.Service(it)) }
    }
    if (places.isNotEmpty()) {
        add(SuggestionRow.Header(SuggestionRow.Group.PLACES))
        places.forEach { add(SuggestionRow.Place(it)) }
    }
}
