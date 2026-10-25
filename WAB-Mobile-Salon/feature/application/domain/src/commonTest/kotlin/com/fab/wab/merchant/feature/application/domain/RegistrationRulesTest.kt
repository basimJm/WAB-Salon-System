package com.fab.wab.merchant.feature.application.domain

import com.fab.wab.merchant.feature.application.domain.model.RegistrationField
import com.fab.wab.merchant.feature.application.domain.model.RegistrationInput
import com.fab.wab.merchant.feature.application.domain.model.SalonGender
import com.fab.wab.merchant.feature.application.domain.model.registrationErrors
import com.fab.wab.merchant.feature.application.domain.model.toForm
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class RegistrationRulesTest {
    private val valid = RegistrationInput(
        salonName = "  Lina Beauty ", gender = SalonGender.WOMEN, firstName = "Lina", lastName = "Haddad",
        cityId = "c1", areaId = "a1", documentKeys = listOf("l/1.pdf"), termsAccepted = true,
    )

    @Test
    fun emptyFormBreaksEveryRule() {
        assertEquals(RegistrationField.entries.toSet(), registrationErrors(RegistrationInput()))
    }

    @Test
    fun validFormIsTrimmed() {
        assertTrue(registrationErrors(valid).isEmpty())
        val form = assertNotNull(valid.toForm())
        assertEquals("Lina Beauty", form.salonName)
        assertEquals("FEMALE", form.gender.code)
    }

    @Test
    fun documentsMustBeOneToFiveAndFinishedUploading() {
        assertTrue(RegistrationField.DOCUMENTS in registrationErrors(valid.copy(documentKeys = emptyList())))
        assertTrue(RegistrationField.DOCUMENTS in registrationErrors(valid.copy(documentKeys = List(6) { "k$it" })))
        assertTrue(RegistrationField.DOCUMENTS in registrationErrors(valid.copy(documentsUploading = true)))
    }

    @Test
    fun namesHaveMaximumLengthsAndTermsAreRequiredOnlyForNewApplications() {
        assertTrue(RegistrationField.SALON_NAME in registrationErrors(valid.copy(salonName = "x".repeat(81))))
        assertTrue(RegistrationField.FIRST_NAME in registrationErrors(valid.copy(firstName = "x".repeat(51))))
        assertNull(valid.copy(termsAccepted = false).toForm())
        assertNotNull(valid.copy(termsAccepted = false).toForm(requireTerms = false))
    }

    @Test
    fun resubmissionChecksOnlyNameTypeAndDocuments() {
        val minimal = RegistrationInput(salonName = "Gents", gender = SalonGender.MEN, documentKeys = listOf("l/1.pdf"))
        assertTrue(registrationErrors(minimal, resubmission = true).isEmpty())
        assertNotNull(minimal.toForm(resubmission = true))
        assertEquals(setOf(RegistrationField.DOCUMENTS), registrationErrors(minimal.copy(documentKeys = emptyList()), resubmission = true))
    }
}
