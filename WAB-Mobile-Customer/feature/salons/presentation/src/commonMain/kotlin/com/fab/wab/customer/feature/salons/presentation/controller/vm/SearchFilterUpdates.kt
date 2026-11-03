package com.fab.wab.customer.feature.salons.presentation.controller.vm

import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterChipId
import com.fab.wab.customer.feature.salons.presentation.controller.contract.QuickChip

/** Pure filter updates of S04 (BUSINESS_DOMAIN §5.22); unit tested. */
object SearchQuickDefaults {
    /** The "4+" quick chip: minimum rating it applies. */
    const val TOP_RATED_MIN = 4
}

/** Whether a quick chip is on for these filters (PRICE opens the sheet and is on while a price range is set). */
fun QuickChip.isOn(filters: SalonFilters): Boolean = when (this) {
    QuickChip.OPEN_NOW -> filters.openNow
    QuickChip.NEAREST -> filters.general == GeneralFilter.NEAREST
    QuickChip.TOP_RATED -> filters.minRating == SearchQuickDefaults.TOP_RATED_MIN
    QuickChip.PRICE -> filters.priceRange != null
}

/** A tap on a toggle chip; PRICE is not a toggle (it opens the filter sheet) and leaves the filters as they are. */
fun SalonFilters.toggle(chip: QuickChip): SalonFilters {
    val on = chip.isOn(this)
    return when (chip) {
        QuickChip.OPEN_NOW -> copy(openNow = !on)
        QuickChip.NEAREST -> copy(general = if (on) null else GeneralFilter.NEAREST)
        QuickChip.TOP_RATED -> copy(minRating = if (on) null else SearchQuickDefaults.TOP_RATED_MIN)
        QuickChip.PRICE -> this
    }
}

fun SalonFilters.without(chip: FilterChipId): SalonFilters = when (chip) {
    is FilterChipId.Service -> copy(services = services.filterNot { it.id == chip.serviceId })
    FilterChipId.Price -> copy(priceRange = null)
    FilterChipId.General -> copy(general = null)
    FilterChipId.Rating -> copy(minRating = null)
    is FilterChipId.Type -> copy(businessTypes = businessTypes - chip.type)
    FilterChipId.Gender -> copy(gender = null)
    FilterChipId.OpenNow -> copy(openNow = false)
}

/** A suggested service becomes a service filter (once). */
fun SalonFilters.withService(service: ServiceRef): SalonFilters =
    if (services.any { it.id == service.id }) this else copy(services = services + service)

/** PRD S04 entry table → initial filters. */
fun AllSalonsEntry.toFilters(): SalonFilters = SalonFilters(
    services = listOfNotNull(serviceId?.let { ServiceRef(it, serviceName ?: it) }),
    general = when (filter) {
        SalonListFilter.RECOMMENDED -> GeneralFilter.RECOMMENDED
        SalonListFilter.NEAREST -> GeneralFilter.NEAREST
        null -> null
    },
    businessTypes = setOfNotNull(businessType),
)
