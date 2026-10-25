package com.fab.wab.merchant.core.data.salon

import com.fab.wab.merchant.core.data.contract.generated.GetSalonData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonDataCompleteness
import com.fab.wab.merchant.core.data.contract.generated.GetSalonDataLocation
import com.fab.wab.merchant.core.data.contract.generated.GetSalonDataRating
import com.fab.wab.merchant.core.domain.salon.CompletenessItem
import com.fab.wab.merchant.core.domain.salon.SalonGenderType
import com.fab.wab.merchant.core.domain.session.SalonState
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull

class SalonMapperTest {
    private val dto = GetSalonData(
        id = "s1", name = "Lina Beauty", gender = "FEMALE", state = "APPROVED_INCOMPLETE", description = " ",
        location = GetSalonDataLocation(31.95, 35.91), completeness = GetSalonDataCompleteness(listOf("COVER", "STAFF", "NEW_ITEM"), false),
        rating = GetSalonDataRating(4.5, 12.0),
    )

    @Test
    fun salonMapsStateGenderLocationAndMissingItems() {
        val salon = dto.toDomain()
        assertEquals(SalonState.APPROVED_INCOMPLETE, salon.state)
        assertEquals(SalonGenderType.FEMALE, salon.gender)
        assertEquals(31.95, salon.location?.latitude)
        assertEquals(setOf(CompletenessItem.COVER, CompletenessItem.STAFF), salon.missing)
        assertFalse(salon.isComplete)
        assertNull(salon.description)
        assertEquals(12, salon.ratingCount)
    }

    @Test
    fun unknownStateReadsAsPendingReview() {
        assertEquals(SalonState.APPLICATION_PENDING, dto.copy(state = "ARCHIVED").toDomain().state)
    }
}
