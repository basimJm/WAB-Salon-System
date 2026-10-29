package com.fab.wab.customer.designsystem.components.domain

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.audience_both
import com.fab.wab.customer.designsystem.resources.audience_men
import com.fab.wab.customer.designsystem.resources.audience_women
import com.fab.wab.customer.designsystem.resources.business_clinic
import com.fab.wab.customer.designsystem.resources.business_label
import com.fab.wab.customer.designsystem.resources.business_salon
import com.fab.wab.customer.designsystem.resources.business_type_all
import com.fab.wab.customer.designsystem.resources.business_type_clinics
import com.fab.wab.customer.designsystem.resources.business_type_salons
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** All / Salons / Clinics, in tab order; null = every business type (BUSINESS_DOMAIN §5.19 list filters). */
val businessTypeTabOrder: List<BusinessType?> = listOf(null, BusinessType.SALON, BusinessType.CLINIC)

fun businessTypeTabIndex(selected: BusinessType?): Int = businessTypeTabOrder.indexOf(selected).coerceAtLeast(0)

fun businessTypeOfTab(index: Int): BusinessType? = businessTypeTabOrder.getOrNull(index)

fun businessTypeTabLabel(type: BusinessType?): StringResource = when (type) {
    null -> Res.string.business_type_all
    BusinessType.SALON -> Res.string.business_type_salons
    BusinessType.CLINIC -> Res.string.business_type_clinics
}

fun businessTypeLabel(type: BusinessType): StringResource = when (type) {
    BusinessType.SALON -> Res.string.business_salon
    BusinessType.CLINIC -> Res.string.business_clinic
}

fun audienceLabel(audience: Audience): StringResource = when (audience) {
    Audience.MALE -> Res.string.audience_men
    Audience.FEMALE -> Res.string.audience_women
    Audience.BOTH -> Res.string.audience_both
}

/** Card / profile line: "Salon · Women", "Beauty clinic · Men & women"; the type alone when the audience is unknown. */
@Composable
fun businessText(type: BusinessType, audience: Audience?): String {
    val typeText = stringResource(businessTypeLabel(type))
    return audience?.let { stringResource(Res.string.business_label, typeText, stringResource(audienceLabel(it))) } ?: typeText
}

/** The All / Salons / Clinics segmented filter of the salon list and the bookings list. */
@Composable
fun BusinessTypeTabs(selected: BusinessType?, onSelect: (BusinessType?) -> Unit, modifier: Modifier = Modifier) {
    AppSegmentedTabs(
        tabs = businessTypeTabOrder.map { stringResource(businessTypeTabLabel(it)) },
        selectedIndex = businessTypeTabIndex(selected),
        onSelect = { onSelect(businessTypeOfTab(it)) },
        modifier = modifier,
    )
}
