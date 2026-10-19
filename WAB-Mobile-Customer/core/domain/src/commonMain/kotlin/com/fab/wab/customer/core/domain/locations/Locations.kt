package com.fab.wab.customer.core.domain.locations

import com.fab.wab.customer.core.domain.AppResult

/** Server-driven reference data (PRD §3.11): never bundled, cached per language because names are localized. */
data class Country(
    val code: String,
    val name: String,
    val dialCode: String,
    val flagUrl: String?,
    val phoneRegex: String,
)

data class City(val id: String, val name: String)

data class Area(val id: String, val name: String)

/** Reads come from the cache of the current language when present; [refresh] (pull to refresh, retry) bypasses it. */
interface LocationsRepository {
    suspend fun countries(refresh: Boolean = false): AppResult<List<Country>>

    suspend fun cities(countryCode: String, refresh: Boolean = false): AppResult<List<City>>

    suspend fun areas(cityId: String, refresh: Boolean = false): AppResult<List<Area>>
}

object LocationDefaults {
    /** PRD S11: the country selector defaults to Jordan. */
    const val DEFAULT_COUNTRY_CODE = "JO"
}

/** The default country when the list has it, else the first entry; null for an empty list. */
fun List<Country>.defaultCountry(code: String = LocationDefaults.DEFAULT_COUNTRY_CODE): Country? =
    firstOrNull { it.code.equals(code, ignoreCase = true) } ?: firstOrNull()
