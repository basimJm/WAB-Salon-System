package com.fab.wab.customer.designsystem

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.designsystem.components.domain.audienceLabel
import com.fab.wab.customer.designsystem.components.domain.businessTypeColors
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
import com.fab.wab.customer.designsystem.resources.business_tattoo
import com.fab.wab.customer.designsystem.resources.business_type_tattoo
import com.fab.wab.customer.designsystem.theme.DarkColors
import com.fab.wab.customer.designsystem.theme.LightColors
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class BusinessTypeTextsTest {

    @Test
    fun lensIsAllSalonsClinicsTattooAndRoundTrips() {
        val lens = listOf(null, BusinessType.SALON, BusinessType.CLINIC, BusinessType.TATTOO)
        assertEquals(listOf(0, 1, 2, 3), lens.map(::businessTypeTabIndex))
        assertEquals(lens, (0..3).map(::businessTypeOfTab))
        assertNull(businessTypeOfTab(-1))
        assertEquals(
            listOf(
                Res.string.business_type_all,
                Res.string.business_type_salons,
                Res.string.business_type_clinics,
                Res.string.business_type_tattoo,
            ),
            lens.map(::businessTypeTabLabel),
        )
    }

    @Test
    fun everyTypeHasItsOwnColorInBothThemes() {
        listOf(LightColors, DarkColors).forEach { palette ->
            val colors = BusinessType.entries.map { businessTypeColors(it, palette) }
            assertEquals(colors.size, colors.map { it.first }.toSet().size, "distinct text colors, dark=${palette.isDark}")
            assertEquals(colors.size, colors.map { it.second }.toSet().size, "distinct tints, dark=${palette.isDark}")
        }
        assertEquals(LightColors.clinicType to LightColors.clinicTypeContainer, businessTypeColors(BusinessType.CLINIC, LightColors))
        assertEquals(DarkColors.tattooType to DarkColors.tattooTypeContainer, businessTypeColors(BusinessType.TATTOO, DarkColors))
    }

    @Test
    fun labelsNameTheTypeAndTheAudience() {
        assertEquals(Res.string.business_salon, businessTypeLabel(BusinessType.SALON))
        assertEquals(Res.string.business_clinic, businessTypeLabel(BusinessType.CLINIC))
        assertEquals(Res.string.business_tattoo, businessTypeLabel(BusinessType.TATTOO))
        assertEquals(
            listOf(Res.string.audience_men, Res.string.audience_women, Res.string.audience_both),
            Audience.entries.map(::audienceLabel),
        )
    }
}
