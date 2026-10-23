package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.model.LocationData
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ProfileFormTest {

    private val valid = ProfileForm(name = "Lina", phone = "+962 79 123 4567", location = LocationData(31.9, 35.9))

    @Test
    fun validFormHasNoErrors() {
        assertTrue(profileErrors(valid).isEmpty())
    }

    @Test
    fun requiredLimitsAndPhoneFormats() {
        val errors = profileErrors(
            ProfileForm(
                name = " ",
                description = "x".repeat(ProfileLimits.DESCRIPTION_MAX + 1),
                phone = "0791234567",
                whatsapp = "12",
                locationText = "y".repeat(ProfileLimits.LOCATION_TEXT_MAX + 1),
            ),
        )
        assertEquals(ProfileField.entries.toSet(), errors)
        assertTrue(ProfileField.NAME in profileErrors(valid.copy(name = "n".repeat(ProfileLimits.NAME_MAX + 1))))
    }

    @Test
    fun onlyChangedFieldsAreSentAndClearedTextBecomesNull() {
        val original = valid.copy(description = "Old", whatsapp = "+962791234567")
        assertTrue(changesOf(original, original.copy(phone = "+962791234567")).isEmpty)
        val changes = changesOf(
            original,
            original.copy(name = " Lina Salon ", description = "", whatsapp = "", coverKey = "salons/1/cover.jpg"),
        )
        assertEquals("Lina Salon", changes.name)
        assertEquals(Change<String?>(null), changes.description)
        assertEquals(Change<String?>(null), changes.whatsapp)
        assertEquals("salons/1/cover.jpg", changes.coverKey)
        assertEquals(null, changes.phone)
    }
}
