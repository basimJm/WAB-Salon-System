package com.fab.wab.merchant.feature.salon.presentation.screen

import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.feature.salon.presentation.resources.Res
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_note_both
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_note_clinic
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_note_men
import com.fab.wab.merchant.feature.salon.presentation.resources.catalog_note_women
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_both
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_clinic
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_men
import com.fab.wab.merchant.feature.salon.presentation.resources.hub_women
import org.jetbrains.compose.resources.StringResource

/** "Women's salon", "Men's salon", "Salon for men and women" or "Beauty clinic" (BUSINESS_DOMAIN §5.19). */
internal fun kindLabel(kind: BusinessKind): StringResource = when {
    kind.isClinic -> Res.string.hub_clinic
    kind.audience == Audience.MALE -> Res.string.hub_men
    kind.audience == Audience.FEMALE -> Res.string.hub_women
    else -> Res.string.hub_both
}

/** Which catalog the picker shows; null (not loaded yet) reads as the unisex salon catalog. */
internal fun catalogNote(kind: BusinessKind?): StringResource = when {
    kind == null -> Res.string.catalog_note_both
    kind.isClinic -> Res.string.catalog_note_clinic
    kind.audience == Audience.MALE -> Res.string.catalog_note_men
    kind.audience == Audience.FEMALE -> Res.string.catalog_note_women
    else -> Res.string.catalog_note_both
}

/** [clinic] wording for a clinic, else [salon] (also while the business is not loaded). */
internal fun byType(type: BusinessType?, salon: StringResource, clinic: StringResource): StringResource =
    if (type == BusinessType.CLINIC) clinic else salon
