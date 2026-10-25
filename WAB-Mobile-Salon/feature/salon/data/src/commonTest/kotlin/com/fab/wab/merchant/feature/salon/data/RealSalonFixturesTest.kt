package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.GetCatalogRequestsDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetCatalogServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonGalleryDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonHoursData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonPolicyData
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSubscriptionData
import com.fab.wab.merchant.core.data.contract.generated.PutSalonHoursWeeklyData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the salon mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealSalonFixturesTest {

    @Test
    fun hoursServicesGalleryPolicySubscriptionAndRequestsMap() {
        val hours = decodeFixture("GetSalonHours", serializer<GetSalonHoursData>()).data
        assertNotNull(hours.toDomain())
        assertNotNull(decodeFixture("PutSalonHoursWeekly", serializer<PutSalonHoursWeeklyData>()).data.toDomain())
        val services = decodeFixture("GetSalonServices", serializer<List<GetSalonServicesDataItem>>()).data
        assertEquals(services.size, services.mapNotNull { it.toDomain() }.size)
        val catalog = decodeFixture("GetCatalogServices", serializer<List<GetCatalogServicesDataItem>>()).data
        assertEquals(catalog.size, catalog.mapNotNull { it.toDomain() }.size)
        val gallery = decodeFixture("GetSalonGallery", serializer<List<GetSalonGalleryDataItem>>()).data
        assertEquals(gallery.size, gallery.mapNotNull { it.toDomain() }.size)
        assertNotNull(assertNotNull(decodeFixture("GetSalonPolicy", serializer<GetSalonPolicyData?>()).data).toDomain())
        assertNotNull(decodeFixture("GetSubscription", serializer<GetSubscriptionData>()).data.toDomain())
        val requests = decodeFixture("GetCatalogRequests", serializer<List<GetCatalogRequestsDataItem>>()).data
        assertEquals(requests.size, requests.mapNotNull { it.toDomain() }.size)
    }
}
