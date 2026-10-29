package com.fab.wab.customer.core.domain.salon

import com.fab.wab.customer.core.domain.session.Gender
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** BUSINESS_DOMAIN §5.19: codes, the gender lock and the bride rule per business type and audience. */
class BusinessTypeTest {

    @Test
    fun codesParseCaseInsensitivelyAndUnknownTypesReadAsSalon() {
        assertEquals(BusinessType.CLINIC, BusinessType.fromCode(" clinic "))
        assertEquals(BusinessType.SALON, BusinessType.fromCode(null))
        assertEquals(BusinessType.SALON, BusinessType.fromCode("SPA"))
        assertNull(BusinessType.fromCodeOrNull(null))
        assertEquals(BusinessType.CLINIC, BusinessType.fromCodeOrNull("CLINIC"))
        assertEquals(Audience.BOTH, Audience.fromCode("both"))
        assertNull(Audience.fromCode("OTHER"))
    }

    @Test
    fun onlyMenOrWomenSalonsLockTheGenderOfEveryPerson() {
        assertEquals(Gender.MALE, BusinessRules.lockedGender(BusinessType.SALON, Audience.MALE))
        assertEquals(Gender.FEMALE, BusinessRules.lockedGender(BusinessType.SALON, Audience.FEMALE))
        assertNull(BusinessRules.lockedGender(BusinessType.SALON, Audience.BOTH))
        assertNull(BusinessRules.lockedGender(BusinessType.CLINIC, Audience.BOTH))
        assertNull(BusinessRules.lockedGender(BusinessType.CLINIC, Audience.FEMALE), "a clinic never locks, whatever it sends")
        assertNull(BusinessRules.lockedGender(BusinessType.SALON, null))
    }

    @Test
    fun brideOnlyForWomenOrBothSalons() {
        assertTrue(BusinessRules.allowsBride(BusinessType.SALON, Audience.FEMALE))
        assertTrue(BusinessRules.allowsBride(BusinessType.SALON, Audience.BOTH))
        assertFalse(BusinessRules.allowsBride(BusinessType.SALON, Audience.MALE))
        assertFalse(BusinessRules.allowsBride(BusinessType.CLINIC, Audience.BOTH))
        assertFalse(BusinessRules.allowsBride(BusinessType.SALON, null))
    }
}
