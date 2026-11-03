package com.fab.wab.customer.designsystem.components.domain

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.designsystem.components.chip.AppFilterChip
import com.fab.wab.customer.designsystem.components.selector.AppSegmentedTabs
import com.fab.wab.customer.designsystem.components.text.AppText
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
import com.fab.wab.customer.designsystem.resources.business_tattoo
import com.fab.wab.customer.designsystem.resources.business_type_tattoo
import com.fab.wab.customer.designsystem.theme.AppColors
import com.fab.wab.customer.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/** The type lens All · Salons · Clinics · Tattoo, in order; null = every business type (BUSINESS_DOMAIN §5.22). */
val businessTypeTabOrder: List<BusinessType?> = listOf(null) + BusinessType.entries

fun businessTypeTabIndex(selected: BusinessType?): Int = businessTypeTabOrder.indexOf(selected).coerceAtLeast(0)

fun businessTypeOfTab(index: Int): BusinessType? = businessTypeTabOrder.getOrNull(index)

fun businessTypeTabLabel(type: BusinessType?): StringResource = when (type) {
    null -> Res.string.business_type_all
    BusinessType.SALON -> Res.string.business_type_salons
    BusinessType.CLINIC -> Res.string.business_type_clinics
    BusinessType.TATTOO -> Res.string.business_type_tattoo
}

fun businessTypeLabel(type: BusinessType): StringResource = when (type) {
    BusinessType.SALON -> Res.string.business_salon
    BusinessType.CLINIC -> Res.string.business_clinic
    BusinessType.TATTOO -> Res.string.business_tattoo
}

/** Text color and tinted container of a type label (salon violet, clinic teal, tattoo amber-brown). Pure: unit tested. */
fun businessTypeColors(type: BusinessType, colors: AppColors): Pair<Color, Color> = when (type) {
    BusinessType.SALON -> colors.salonType to colors.salonTypeContainer
    BusinessType.CLINIC -> colors.clinicType to colors.clinicTypeContainer
    BusinessType.TATTOO -> colors.tattooType to colors.tattooTypeContainer
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

/** The type label on every discovery card: "Salon" / "Beauty clinic" / "Tattoo studio" in the type's color. */
@Composable
fun BusinessTypeBadge(type: BusinessType, modifier: Modifier = Modifier) {
    val (content, container) = businessTypeColors(type, AppTheme.colors)
    AppText(
        text = stringResource(businessTypeLabel(type)),
        style = AppTheme.typography.labelSmall,
        color = content,
        maxLines = 1,
        modifier = modifier
            .background(container, AppTheme.shapes.small)
            .padding(horizontal = AppTheme.spacing.space8, vertical = AppTheme.spacing.space2),
    )
}

/** The type lens chips All · Salons · Clinics · Tattoo (Home, Search, Bookings); scrolls sideways at large font scales. */
@Composable
fun BusinessTypeLens(selected: BusinessType?, onSelect: (BusinessType?) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        businessTypeTabOrder.forEach { type ->
            AppFilterChip(
                text = stringResource(businessTypeTabLabel(type)),
                selected = type == selected,
                onClick = { onSelect(type) },
            )
        }
    }
}

/** The segmented type filter (All / Salons / Clinics / Tattoo). */
@Composable
fun BusinessTypeTabs(selected: BusinessType?, onSelect: (BusinessType?) -> Unit, modifier: Modifier = Modifier) {
    // The caller's padding stays outside the glass track: `glassBackground` re-applies the modifier chain it extends.
    Box(modifier) {
        AppSegmentedTabs(
            tabs = businessTypeTabOrder.map { stringResource(businessTypeTabLabel(it)) },
            selectedIndex = businessTypeTabIndex(selected),
            onSelect = { onSelect(businessTypeOfTab(it)) },
        )
    }
}
