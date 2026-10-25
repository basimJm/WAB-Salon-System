package com.fab.wab.customer.feature.salons.data

import com.fab.wab.customer.core.data.contract.generated.GetSalonsDataItem
import com.fab.wab.customer.core.data.mock.decodeFixture
import com.fab.wab.customer.feature.salons.data.repository.toDomain
import kotlinx.serialization.builtins.ListSerializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** CUS-060: `GET /salons` captured from the dev API: one card per salon with its nearest branch, paginated. */
class RealSalonsFixtureTest {

    @Test
    fun realSearchPageMapsCardsAndMeta() {
        val response = decodeFixture("GetSalons", ListSerializer(GetSalonsDataItem.serializer()))
        val meta = assertNotNull(response.meta)
        val cards = response.data.map { it.toDomain() }
        assertTrue(cards.isNotEmpty() && cards.size <= meta.pageSize)
        assertEquals(cards.size, cards.map { it.id }.toSet().size, "one card per salon")
        assertTrue(cards.all { it.branchCount >= 1 && it.branch != null && it.rating in 0f..5f })
    }
}
