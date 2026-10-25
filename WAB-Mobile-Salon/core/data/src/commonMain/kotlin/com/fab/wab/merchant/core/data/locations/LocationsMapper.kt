package com.fab.wab.merchant.core.data.locations

import com.fab.wab.merchant.core.data.contract.generated.GetLocationsAreasDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetLocationsCitiesDataItem
import com.fab.wab.merchant.core.data.contract.generated.GetLocationsCountriesDataItem
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country

fun GetLocationsCountriesDataItem.toDomain(): Country = Country(
    code = code,
    name = name,
    dialCode = dialCode,
    flagUrl = flagUrl.takeIf { it.isNotBlank() },
    phoneRegex = phoneRegex,
)

fun GetLocationsCitiesDataItem.toDomain(): City = City(id = id, name = name)

fun GetLocationsAreasDataItem.toDomain(): Area = Area(id = id, name = name)
