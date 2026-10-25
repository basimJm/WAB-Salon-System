package com.fab.wab.merchant.feature.home.data

import com.fab.wab.merchant.core.data.contract.generated.GetDashboardData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the dashboard mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealDashboardFixtureTest {

    @Test
    fun realDashboardMaps() {
        val raw = decodeFixture("GetDashboard", serializer<GetDashboardData>()).data
        val dashboard = raw.toDomain()
        assertEquals(raw.salon.id, dashboard.salon.id)
        assertNotNull(dashboard.salon.state)
        assertEquals(raw.pending?.items?.size, dashboard.pending?.items?.size)
        assertTrue(dashboard.salon.imageUrl.orEmpty().startsWith("https://"))
    }
}
