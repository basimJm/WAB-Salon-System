package com.fab.wab.merchant.core.domain.salon

import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** BUSINESS_DOMAIN §5.19 rules the merchant app derives from the type + audience. */
class BusinessKindTest {
    private val men = BusinessKind(BusinessType.SALON, Audience.MALE)
    private val women = BusinessKind(BusinessType.SALON, Audience.FEMALE)
    private val both = BusinessKind(BusinessType.SALON, Audience.BOTH)
    private val clinic = BusinessKind(BusinessType.CLINIC, Audience.BOTH)

    @Test
    fun brideOptionsExistOnlyForSalonsServingWomen() {
        assertFalse(men.brideAllowed)
        assertTrue(women.brideAllowed)
        assertTrue(both.brideAllowed)
        assertFalse(clinic.brideAllowed)
    }

    @Test
    fun onlyMenOrWomenSalonsCanWidenToBoth() {
        assertTrue(men.canWidenAudience)
        assertTrue(women.canWidenAudience)
        assertFalse(both.canWidenAudience)
        assertFalse(clinic.canWidenAudience)
    }

    @Test
    fun catalogGenderNarrowsOnlySingleAudienceSalons() {
        assertEquals(Audience.MALE, men.catalogGender)
        assertEquals(Audience.FEMALE, women.catalogGender)
        assertNull(both.catalogGender)
        assertNull(clinic.catalogGender)
    }

    @Test
    fun aClinicIsAlwaysUnisexAndASalonNeedsItsAudience() {
        assertEquals(clinic, BusinessKind.of(BusinessType.CLINIC, Audience.MALE))
        assertEquals(clinic, BusinessKind.of(BusinessType.CLINIC, null))
        assertNull(BusinessKind.of(BusinessType.SALON, null))
        assertEquals(women, BusinessKind.of(BusinessType.SALON, Audience.FEMALE))
        assertTrue(clinic.isClinic)
        assertNull(BusinessType.fromCode("SPA"))
        assertEquals(Audience.BOTH, Audience.fromCode("BOTH"))
    }

    @Test
    fun bothLicensePurposesUseThePublicLicenseRoutes() {
        assertTrue(UploadPurpose.LICENSE_DOCUMENT.isLicense)
        assertTrue(UploadPurpose.MEDICAL_LICENSE.isLicense)
        assertFalse(UploadPurpose.SALON_COVER.isLicense)
    }

    /** §5.23: a tattoo studio is always unisex, never takes brides and never changes its audience. */
    @Test
    fun aTattooStudioIsAlwaysUnisexWithoutBrides() {
        val tattoo = assertNotNullKind(BusinessKind.of(BusinessType.TATTOO, Audience.MALE))
        assertEquals(Audience.BOTH, tattoo.audience)
        assertTrue(tattoo.isTattoo)
        assertFalse(tattoo.isClinic)
        assertFalse(tattoo.brideAllowed)
        assertFalse(tattoo.canWidenAudience)
        assertNull(tattoo.catalogGender)
        assertEquals(BusinessType.TATTOO, BusinessType.fromCode("TATTOO"))
    }

    private fun assertNotNullKind(kind: BusinessKind?): BusinessKind = kind ?: error("expected a business kind")
}
