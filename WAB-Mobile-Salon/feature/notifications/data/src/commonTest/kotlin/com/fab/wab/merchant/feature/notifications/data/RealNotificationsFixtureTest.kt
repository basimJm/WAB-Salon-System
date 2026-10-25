package com.fab.wab.merchant.feature.notifications.data

import com.fab.wab.merchant.core.data.contract.generated.GetNotificationsDataItem
import com.fab.wab.merchant.core.data.mock.decodeFixture
import com.fab.wab.merchant.feature.notifications.data.repository.toDomain
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the notifications mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealNotificationsFixtureTest {

    @Test
    fun everyRowMaps() {
        val rows = decodeFixture("GetNotifications", serializer<List<GetNotificationsDataItem>>()).data
        assertTrue(rows.isNotEmpty())
        assertEquals(rows.size, rows.mapNotNull { it.toDomain() }.size)
    }
}
