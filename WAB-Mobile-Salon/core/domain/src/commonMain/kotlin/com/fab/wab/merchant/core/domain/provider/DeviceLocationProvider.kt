package com.fab.wab.merchant.core.domain.provider

import com.fab.wab.merchant.core.domain.model.LocationData

interface DeviceLocationProvider {
    fun fetchCurrentLocation(onResult: (LocationData?) -> Unit)
}
