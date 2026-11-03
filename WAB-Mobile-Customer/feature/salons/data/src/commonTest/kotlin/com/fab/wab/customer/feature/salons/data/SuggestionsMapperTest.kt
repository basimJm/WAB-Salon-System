package com.fab.wab.customer.feature.salons.data

import com.fab.wab.customer.core.data.contract.generated.GetSalonsSuggestionsData
import com.fab.wab.customer.core.data.contract.generated.GetSalonsSuggestionsDataPlacesItem
import com.fab.wab.customer.core.data.contract.generated.GetSalonsSuggestionsDataServicesItem
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.feature.salons.data.repository.toDomain
import com.fab.wab.customer.feature.salons.domain.model.SearchSuggestions
import com.fab.wab.customer.feature.salons.domain.model.SuggestionRow
import com.fab.wab.customer.feature.salons.domain.model.rows
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** CUS-103: suggestions map with their type and places count, grouped Services then Places. */
class SuggestionsMapperTest {

    private val data = GetSalonsSuggestionsData(
        services = listOf(
            GetSalonsSuggestionsDataServicesItem("s1", "Laser hair removal", "CLINIC", 4.0),
            GetSalonsSuggestionsDataServicesItem("s1", "Laser hair removal", "CLINIC", 4.0),
            GetSalonsSuggestionsDataServicesItem("s2", "Fine line", "TATTOO", -1.0),
        ),
        places = listOf(GetSalonsSuggestionsDataPlacesItem("p1", "Laser Lounge", "SALON", "FEMALE")),
    )

    @Test
    fun servicesKeepTypeAndPlacesCountWithoutDuplicates() {
        val suggestions = data.toDomain()
        assertEquals(listOf("s1", "s2"), suggestions.services.map { it.id })
        assertEquals(listOf(BusinessType.CLINIC, BusinessType.TATTOO), suggestions.services.map { it.businessType })
        assertEquals(listOf(4, 0), suggestions.services.map { it.placesCount }, "a negative count reads as 0")
        assertEquals(Audience.FEMALE, suggestions.places.single().audience)
    }

    @Test
    fun rowsAreServicesThenPlacesEachUnderItsHeader() {
        val rows = data.toDomain().rows()
        assertEquals(SuggestionRow.Header(SuggestionRow.Group.SERVICES), rows.first())
        assertEquals(SuggestionRow.Header(SuggestionRow.Group.PLACES), rows[3])
        assertEquals("p1", (rows.last() as SuggestionRow.Place).place.id)
        assertEquals(5, rows.size)
    }

    @Test
    fun anEmptyGroupHasNoHeader() {
        val onlyPlaces = data.toDomain().copy(services = emptyList()).rows()
        assertEquals(listOf(SuggestionRow.Group.PLACES), onlyPlaces.filterIsInstance<SuggestionRow.Header>().map { it.group })
        assertTrue(SearchSuggestions.NONE.rows().isEmpty())
        assertTrue(SearchSuggestions.NONE.isEmpty)
    }
}
