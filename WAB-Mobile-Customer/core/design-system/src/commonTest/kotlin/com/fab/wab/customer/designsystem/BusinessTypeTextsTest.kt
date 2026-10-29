package com.fab.wab.customer.designsystem

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.designsystem.components.domain.audienceLabel
import com.fab.wab.customer.designsystem.components.domain.businessTypeLabel
import com.fab.wab.customer.designsystem.components.domain.businessTypeOfTab
import com.fab.wab.customer.designsystem.components.domain.businessTypeTabIndex
import com.fab.wab.customer.designsystem.components.domain.businessTypeTabLabel
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.audience_both
import com.fab.wab.customer.designsystem.resources.audience_men
import com.fab.wab.customer.designsystem.resources.audience_women
import com.fab.wab.customer.designsystem.resources.business_clinic
import com.fab.wab.customer.designsystem.resources.business_salon
import com.fab.wab.customer.designsystem.resources.business_type_all
import com.fab.wab.customer.designsystem.resources.business_type_clinics
import com.fab.wab.customer.designsystem.resources.business_type_salons
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class BusinessTypeTextsTest {

    @Test
    fun tabsAreAllSalonsClinicsAndRoundTrip() {
        assertEquals(listOf(0, 1, 2), listOf(null, BusinessType.SALON, BusinessType.CLINIC).map(::businessTypeTabIndex))
        assertEquals(listOf(null, BusinessType.SALON, BusinessType.CLINIC), (0..2).map(::businessTypeOfTab))
        assertNull(businessTypeOfTab(-1))
        assertEquals(
            listOf(Res.string.business_type_all, Res.string.business_type_salons, Res.string.business_type_clinics),
            listOf(null, BusinessType.SALON, BusinessType.CLINIC).map(::businessTypeTabLabel),
        )
    }

    @Test
    fun labelsNameTheTypeAndTheAudience() {
        assertEquals(Res.string.business_salon, businessTypeLabel(BusinessType.SALON))
        assertEquals(Res.string.business_clinic, businessTypeLabel(BusinessType.CLINIC))
        assertEquals(
            listOf(Res.string.audience_men, Res.string.audience_women, Res.string.audience_both),
            Audience.entries.map(::audienceLabel),
        )
    }
}
