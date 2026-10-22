package com.fab.wab.merchant.feature.salon.data

import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.feature.salon.domain.Change
import com.fab.wab.merchant.feature.salon.domain.ProfileChanges
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals

class ProfileBodyTest {

    @Test
    fun onlyChangedFieldsWithExplicitNullsForClearedOnes() {
        val body = ProfileChanges(
            name = "Lina",
            description = Change(null),
            location = LocationData(31.9, 35.9),
            whatsapp = Change("+962791234567"),
        ).toBody()
        assertEquals(setOf("name", "description", "location", "whatsapp"), body.keys)
        assertEquals(JsonNull, body["description"])
        assertEquals(JsonPrimitive("+962791234567"), body["whatsapp"])
        assertEquals(JsonPrimitive(31.9), (body["location"] as JsonObject)["latitude"])
    }
}
