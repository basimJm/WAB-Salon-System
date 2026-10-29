package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.data.contract.generated.GetCatalogServicesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetSalonServicesDataItem
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.feature.salon.domain.ServiceDraft
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ServicesMappersTest {

    @Test
    fun rowsMapAndUnknownTypeOrAudienceDrops() {
        val service = GetSalonServicesDataItem("s1", "c1", "Cut", "img", "12.500", 45.0, false, " ", emptyList(), true).toDomain()
        assertEquals(45, service.durationMinutes)
        assertNull(service.extraDescription)
        val item = GetCatalogServicesDataItem("c1", "Cut", "d", "img", "SALON", "female")
        assertEquals(BusinessKind(BusinessType.SALON, Audience.FEMALE), item.toDomain()?.kind)
        val clinic = item.copy(businessType = "CLINIC", audience = "BOTH")
        assertEquals(BusinessKind(BusinessType.CLINIC, Audience.BOTH), clinic.toDomain()?.kind)
        assertNull(item.copy(businessType = "SPA").toDomain(), "unknown types are never offered")
        assertNull(item.copy(audience = "OTHER").toDomain())
    }

    @Test
    fun patchSendsNormalizedValuesAndClearsTheDescription() {
        val body = ServiceDraft(price = "١٢٫٥", durationMinutes = "45", description = "  ", active = false).toPatch()
        assertEquals(JsonPrimitive("12.5"), body["price"])
        assertEquals(JsonPrimitive(45), body["durationMinutes"])
        assertEquals(JsonNull, body["extraDescription"])
        assertEquals(JsonPrimitive(false), body["active"])
        assertNull(body["mediaKeys"])
    }
}
