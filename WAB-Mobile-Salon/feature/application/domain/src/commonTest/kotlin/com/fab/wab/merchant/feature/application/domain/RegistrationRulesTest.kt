package com.fab.wab.merchant.feature.application.domain

import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.feature.application.domain.model.RegistrationField
import com.fab.wab.merchant.feature.application.domain.model.RegistrationInput
import com.fab.wab.merchant.feature.application.domain.model.registrationErrors
import com.fab.wab.merchant.feature.application.domain.model.toForm
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class RegistrationRulesTest {
    private val valid = RegistrationInput(
        businessType = BusinessType.SALON, salonName = "  Lina Beauty ", audience = Audience.FEMALE,
        firstName = "Lina", lastName = "Haddad",
        cityId = "c1", areaId = "a1", documentKeys = listOf("l/1.pdf"), termsAccepted = true,
    )

    private val clinic = valid.copy(businessType = BusinessType.CLINIC, audience = null, medicalLicenseKeys = listOf("m/1.pdf"))

    @Test
    fun emptyFormBreaksEveryRuleExceptTheTypeSpecificOnes() {
        val typeSpecific = setOf(RegistrationField.AUDIENCE, RegistrationField.MEDICAL_LICENSE)
        assertEquals(RegistrationField.entries.toSet() - typeSpecific, registrationErrors(RegistrationInput()))
    }

    @Test
    fun aSalonNeedsAnAudienceAndNoMedicalLicense() {
        assertEquals(setOf(RegistrationField.AUDIENCE), registrationErrors(valid.copy(audience = null)))
        val both = assertNotNull(valid.copy(audience = Audience.BOTH, medicalLicenseKeys = listOf("m/1.pdf")).toForm())
        assertEquals(Audience.BOTH, both.kind.audience)
        assertTrue(both.medicalLicenseKeys.isEmpty(), "a salon never sends a medical license")
    }

    @Test
    fun aClinicIsUnisexAndNeedsOneToFiveFinishedMedicalLicenseFiles() {
        val form = assertNotNull(clinic.toForm())
        assertEquals(BusinessType.CLINIC, form.kind.type)
        assertEquals(Audience.BOTH, form.kind.audience)
        assertEquals(listOf("m/1.pdf"), form.medicalLicenseKeys)
        assertEquals(setOf(RegistrationField.MEDICAL_LICENSE), registrationErrors(clinic.copy(medicalLicenseKeys = emptyList())))
        assertEquals(setOf(RegistrationField.MEDICAL_LICENSE), registrationErrors(clinic.copy(medicalLicenseKeys = List(6) { "m$it" })))
        assertEquals(setOf(RegistrationField.MEDICAL_LICENSE), registrationErrors(clinic.copy(medicalUploading = true)))
    }

    @Test
    fun aClinicResubmissionKeepsTheMedicalLicenseOnFileUnlessReplaced() {
        val resubmit = RegistrationInput(businessType = BusinessType.CLINIC, salonName = "Glow", documentKeys = listOf("l/1.pdf"))
        assertTrue(registrationErrors(resubmit, resubmission = true).isEmpty())
        assertTrue(assertNotNull(resubmit.toForm(resubmission = true)).medicalLicenseKeys.isEmpty())
        assertEquals(
            setOf(RegistrationField.MEDICAL_LICENSE),
            registrationErrors(resubmit.copy(medicalUploading = true), resubmission = true),
        )
    }

    @Test
    fun validFormIsTrimmed() {
        assertTrue(registrationErrors(valid).isEmpty())
        val form = assertNotNull(valid.toForm())
        assertEquals("Lina Beauty", form.salonName)
        assertEquals(Audience.FEMALE, form.kind.audience)
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
    fun resubmissionChecksOnlyTypeNameAudienceAndDocuments() {
        val minimal = RegistrationInput(
            businessType = BusinessType.SALON,
            salonName = "Gents",
            audience = Audience.MALE,
            documentKeys = listOf("l/1.pdf"),
        )
        assertTrue(registrationErrors(minimal, resubmission = true).isEmpty())
        assertNotNull(minimal.toForm(resubmission = true))
        assertEquals(setOf(RegistrationField.DOCUMENTS), registrationErrors(minimal.copy(documentKeys = emptyList()), resubmission = true))
    }
}
